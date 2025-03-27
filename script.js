var skv = {};
const marginTop = 30;
const marginBottom = 15;
const marginLeft = 30;
const marginRight = 45;
skv.tlx =      marginLeft;
skv.tly =      marginTop;
skv.brx =     800;
skv.bry =     800;
skv.hspread = 90;
skv.vspread =  70;
skv.brtemp  =  50;
skv.type    =   1;
skv.font    =  "10px Arial";
skv.plevels = new Array(1000, 850, 700, 500, 400, 300, 200, 100);
const RMISSD = -9999;

function GetPositionScale(x, y, canvas){
  return {x:(x/100)*canvas.width, y:(y/100)*canvas.height};
}

function Lerp(a, b, t){
  return a + (b-a)*t;
}

function GetLerpFactor(a, b, g){
  return (1-(g-b)/(a-b));
}

function temp_to_pix(temp, pres) {
  var scl1, scl2;
  if (skv.type == 1) {
    scl1 = skv.brtemp - (((skv.bry - pres_to_pix(pres)) /
          (skv.bry - skv.tly)) * skv.vspread);
    }
  else {
    scl1 = skv.brtemp;
    }
  scl2 = skv.brx - (((scl1 - temp) / skv.hspread) * (skv.brx - skv.tlx));
  return scl2;
}

function log10(val) {
  return Math.log(val) / Math.log(10);
  }

function temp_at_mixrat(mr, pres) {
  if (!qc(mr) || !qc(pres)) return RMISSD;

  c1 = 0.0498646455;
  c2 = 2.4082965;
  c3 = 7.07475;
  c4 = 38.9114;
  c5 = 0.0915;
  c6 = 1.2035;

  x = log10(mr * pres / (622.0 + mr));
  tmrk = Math.pow(10, c1 * x + c2) - c3 + c4 * Math.pow(Math.pow(10, c5 * x) - c6, 2);
  return tmrk - 273.15;
 }

function pres_to_pix(pres) {
  var scl1 = Math.log(1050) - Math.log(100);
  var scl2 = Math.log(1050) - Math.log(pres);
  return (skv.bry - (scl2/scl1) * (skv.bry - skv.tly));
}

function pix_to_pres(y) {
  var scl1 = Math.log(1050) - Math.log(100);
  var scl2 = skv.bry - y;
  var scl3 = skv.bry - skv.tly + 1;
  return (1050 / Math.exp((scl2 / scl3) * scl1));
  }

function pix_to_temp(x, y) {
        var scl1 = 1 - ((x - skv.tlx) / (skv.brx - skv.tlx));
        var scl2 = skv.brtemp - (scl1 * skv.hspread);
        var scl1 = 1 - ((y - skv.tly) / (skv.bry - skv.tly));
        var scl3 = scl2 - (scl1 * skv.vspread);
        return scl3;
  }

function RadToDeg(rad) {
  return rad * (180 / Math.PI);
}

function DegToRad(deg) {
  return deg * (Math.PI / 180);
}

function drawShape(ctx, color = "rgba(255,255,255,1)", x = 0, y = 0, wx = 10, wy = 10) {
  ctx.fillStyle = `${color}`;
  ctx.fillRect(x, y, wx, wy);
}

function VirtTemp(Slice, SP, Thing = false, Conv = false){
 // let tk = t + ZEROCNK;
 // let w = 0.001 * MixRatio(p, td);
 // let vt = (tk * (1 + (w/eps))/(1+w))-ZEROCNK;
  
  if (Thing){
    //let TopValue = Slice[2] + 273.15;
   // let BotValue = (1 - 0.379 * ( ( 6.11 * Math.pow(10, ((7.5 * Slice[3])/(237.7 + Slice[3]))))/Slice[0]));
    let tk = Slice[2] + ZEROCNK;
    let w = 0.001 * mixratio(SP, Slice[3]);
    let vt = (tk * (1 + (w/eps))/(1+w) -ZEROCNK);
    if (Conv){
      return Math.max(vt,Slice[2]);
      //return (TopValue/BotValue) - 273.15;
    } else {
      return Math.max(vt,Slice[2]);
     // return (TopValue/BotValue);
    }
    
  } else {
    let tk = Slice.T + ZEROCNK;
    let w = 0.001 * mixratio(SP, Slice.D);
    let vt = (tk * (1 + (w/eps))/(1+w))-ZEROCNK;
	//return (tk * (1.0 + w/eps) / (1.0 + w) - cta);
    if (Conv){
      return Math.max(vt,Slice.T);
      //return (TopValue/BotValue) - 273.15;
    } else {
      return Math.max(vt,Slice.T);
     // return (TopValue/BotValue);
    }
  }
}

function QCCheck(N){
	return (N != -9999 && !isNaN(N))
}

function GetLayerByPres(Sounding, Level, Type="All"){
  if (Level == "SFC") {
	  let P = Sounding.Slice[0];
	  if (QCCheck(P[0]) && QCCheck(P[1]) &&QCCheck(P[2]) &&QCCheck(P[3]) &&QCCheck(P[4]) &&QCCheck(P[5]) && QCCheck(P[6]) ){
		  return ConvertToInfo(Sounding.Slice[0], Sounding.Slice[0][0]);
	  } else {
		  return ConvertToInfo(Sounding.Slice[1], Sounding.Slice[1][0]);
	  }
  }

  if (Level == "Last") {
    return ConvertToInfo(Sounding.Slice[Sounding.Slice.length-1], Sounding.Slice[1][0]);
  }
  
  for (let i = 0; i < Sounding.Slice.length; i++){
    if (Sounding.Slice[i][0] == Level){
      return ConvertToInfo(Sounding.Slice[i], Sounding.Slice[1][0]);
    } else if (Sounding.Slice[i][0] > Level && Sounding.Slice[i+1][0] < Level){
      let Slice = {};
      let LerpFactor = GetLerpFactor(Sounding.Slice[i][0], Sounding.Slice[i+1][0], Level);
      //console.log(LerpFactor, Sounding.Slice[i][0], Sounding.Slice[i+1][0]);

      for (let x = 0; x < Sounding.Slice[i].length; x++){
        Slice[x] = Lerp(Sounding.Slice[i][x], Sounding.Slice[i+1][x], LerpFactor);
      }

      //Slice.VT = VirtTemp(Slice);

      return ConvertToInfo(Slice, Sounding.Slice[1][0]);
    }
  }
}

function ConvertToInfo(N, SP){
  return {
    P:N[0],
    H:N[1],
    T : N[2],
    D : N[3],
    VT : VirtTemp(N, SP, true, true),
    WD : N[4],
    WS : N[5],
	WB : N[6],
  }
}

function ConvertToRaw(N, SP){
  return [N.P, N.H, N.T, N.D, N.WD, N.WS, N.WB];
}

function GetLayerByTemp(Sounding, Level){
  if (Level == "SFC") {
	  let P = Sounding.Slice[0];
	  if (QCCheck(P[0]) && QCCheck(P[1]) &&QCCheck(P[2]) &&QCCheck(P[3]) &&QCCheck(P[4]) &&QCCheck(P[5]) && QCCheck(P[6]) ){
		  return ConvertToInfo(Sounding.Slice[0], Sounding.Slice[0][0]);
	  } else {
		  return ConvertToInfo(Sounding.Slice[1], Sounding.Slice[1][0]);
	  }
  }

  for (let i = 0; i < Sounding.Slice.length-1; i++){
    if (Sounding.Slice[i][2] == Level){
      return ConvertToInfo(Sounding.Slice[i],  Sounding.Slice[1][0]);
    } else if ((Sounding.Slice[i][2] > Level && Sounding.Slice[i+1][2] < Level) || 
				(Sounding.Slice[i][2] < Level && Sounding.Slice[i+1][2] > Level)){
      let Slice = {};
      let LerpFactor = GetLerpFactor(Sounding.Slice[i][2], Sounding.Slice[i+1][2], Level);
      //console.log(LerpFactor, Sounding.Slice[i][1], Sounding.Slice[i+1][1]);

      for (let x = 0; x < Sounding.Slice[i].length; x++){
        Slice[x] = Lerp(Sounding.Slice[i][x], Sounding.Slice[i+1][x], LerpFactor);
      }

      return ConvertToInfo(Slice, Sounding.Slice[1][0]);
    }
  }
  
  return false;
}

function GetLowestWindProf(Sounding){
  for (let i = 1; i < Sounding.Slice.length; i++){
    if (Sounding.Slice[i][4] != -9999 && Sounding.Slice[i][5] != -9999) {
      return i;
    }
  }
}

function GetLowestTDProf(Sounding){
  for (let i = 0; i < Sounding.Slice.length; i++){
    if (Sounding.Slice[i][2] != -9999 && Sounding.Slice[i][3] != -9999) {
      return i;
    }
  }
}

function GetLayerByHght(Sounding, Level, addTo=true){
  if (Level == "SFC") {
	  let P = Sounding.Slice[0];
	  if (QCCheck(P[0]) && QCCheck(P[1]) &&QCCheck(P[2]) &&QCCheck(P[3]) &&QCCheck(P[4]) &&QCCheck(P[5]) && QCCheck(P[6]) ){
		  return ConvertToInfo(Sounding.Slice[0], Sounding.Slice[0][0]);
	  } else {
		  return ConvertToInfo(Sounding.Slice[1], Sounding.Slice[1][0]);
	  }
  }
  
  if (addTo){
	Level += Sounding.Slice[1][1];
  }

  for (let i = 0; i < Sounding.Slice.length; i++){
	if (Sounding.Slice[i+1] == undefined){
		return false;
	}
    if (Sounding.Slice[i][1] == Level){
      return ConvertToInfo(Sounding.Slice[i],  Sounding.Slice[1][0]);
    } else if (Sounding.Slice[i][1] < Level && Sounding.Slice[i+1][1] > Level){
      let Slice = {};
      let LerpFactor = GetLerpFactor(Sounding.Slice[i][1], Sounding.Slice[i+1][1], Level);
      //console.log(LerpFactor, Sounding.Slice[i][1], Sounding.Slice[i+1][1]);

      for (let x = 0; x < Sounding.Slice[i].length; x++){
        Slice[x] = Lerp(Sounding.Slice[i][x], Sounding.Slice[i+1][x], LerpFactor);
      }

      return ConvertToInfo(Slice,  Sounding.Slice[1][0]);
    }
  }
}

function MeanWindNW(Sounding, PBot, PTop, Inc){
  let WX = 0;
  let WY = 0;
  let Vals = 0;

  for (let i = PBot; i >= PTop; i-=Inc){
    let Layer = GetLayerByPres(Sounding, i);
    let Wind = ConvertPolartoCart(Layer);

    Vals += 1;
    WX += Wind.x;
    WY += Wind.y ;
  }

  return {x:WX/Vals, y:WY/Vals};
}

function MeanWind(Sounding, PBot, PTop, Inc){
  let TWeight = 0;
  let WX = 0;
  let WY = 0;
  let Values = [];
  
  for (let i = PBot; i > PTop; i-=Inc){
    let Layer = GetLayerByPres(Sounding, i);
    let Wind = ConvertPolartoCart(Layer);

    TWeight += i;
    WX += Wind.x * i;
    WY += Wind.y * i;
  }

  return {x:WX/TWeight, y:WY/TWeight};
}

function WindShear(L1,L2){
  return {x: L2.x - L1.x, y: L2.y - L1.y};
}

function WindShearFind(Sounding, L1, L2){
  let Lower = GetLayerByHght(Sounding, L1);
  let Higher = GetLayerByHght(Sounding, L2);
	
  return WindShear(ConvertPolartoCart(Lower), ConvertPolartoCart(Higher));
}

function WindShearFindP(Sounding, L1, L2){
	let Lower = GetLayerByPres(Sounding, L1);
	let Higher = GetLayerByPres(Sounding, L2);
	
	return WindShear(ConvertPolartoCart(Lower), ConvertPolartoCart(Higher));
}

function degtoRad(degrees) {
  return degrees * (Math.PI / 180);
}

function ConvertPolartoCartSRH(Slice){
 // console.log(Slice);
  return {
    x: Slice.WS * Math.cos(degtoRad((Slice.WD)%360)),
    y: Slice.WS * Math.sin(degtoRad((Slice.WD)%360))
  }
}

function ConvertPolartoCart(Slice){
 // console.log(Slice);
  return {
    x: Slice.WS * Math.cos(degtoRad((Slice.WD+90)%360)),
    y: Slice.WS * Math.sin(degtoRad((Slice.WD+90)%360))
  }
}

function GetBM(Sounding){
  let d = M2TOKTS(7.5);
  
  let hght0km = GetLayerByHght(Sounding, 0);
  let hght6km = GetLayerByHght(Sounding, 6000);

  let Mean6km = MeanWindNW(Sounding, hght0km.P, hght6km.P, 1);
  let Shear6km = WindShear(ConvertPolartoCart(hght0km), ConvertPolartoCart(hght6km));


  let SHRU = Shear6km.x;
  let SHRV = Shear6km.y;

  let tmp = d / (Math.sqrt(Math.pow(SHRU,2)+Math.pow(SHRV,2)));
  
  let LST = {
    x: Mean6km.x + (tmp * SHRV),
    y: Mean6km.y - (tmp * SHRU),
  };
  let RST = {
    x: Mean6km.x - (tmp * SHRV),
    y: Mean6km.y + (tmp * SHRU),
  };

  return {RM:RST,LM:LST};
}

function M2TOKTS(N){
  return N/0.514444444;
}

function KTSTOM2(N){
  return N*0.514444444;
}

function Mag(N){
  return Math.sqrt(Math.pow(N.x, 2) + Math.pow(N.y ,2));
}

function DrawHodograph(Json){
  const Canv = document.getElementById("hodograph");
  const ctx = Canv.getContext("2d");
  
  //console.log(hght0km, hght6km, Shear06km, Mag(Shear06km));
  
  //.console.log(Canv.style);

  Canv.width = 800;//Canv.style.width;
  Canv.height = 800;

  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.fillRect(0,0,1000,1000);
  
  ctx.fillStyle = "rgba(255,255,255,1)"
  ctx.font = `bold ${Canv.width/55}px sans-serif`;
  ctx.fillText(`powered by SharpJS v0.96`, Canv.width*0.75,Canv.height * 0.02);
  
  
  
  
  ctx.fillStyle = "rgba(255,255,255,1)"
  ctx.textAlign = "left";
  
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 4;

	ctx.lineWidth = 1.5;
ctx.setLineDash([4,4]);
  //Pixels per Knot;
  const Scale = 27;
  let Sounding = Json.Sounding;
  let BRM = GetBM(Sounding);
//console.log(BRM, "BRM");


  ctx.fillStyle = "rgba(255,255,255,1)";
  
  
  
const CT = GetPositionScale(50, 50, Canv);
  ctx.font = `bold ${Canv.width/75}px sans-serif`;
ctx.scale(2,2);

ctx.font = `${Canv.width/75}px sans-serif`;
 
  let BrmComps = Math.round(Math.sqrt(Math.pow(BRM.RM.x,2)+Math.pow(BRM.RM.y,2)));
  let BlmComps = Math.round(Math.sqrt(Math.pow(BRM.LM.x,2)+Math.pow(BRM.LM.y,2)));
  let CustomComps = Math.round(Math.sqrt(Math.pow(CUMot.x, 2)+ Math.pow(CUMot.y, 2)));
  
  HodographCenter = [
	50 - (CSMot.x * (Scale/10))/4,
	50 + (CSMot.y * (Scale/10))/4
  ]
  
  console.log(CT.x)
  
  const Center = GetPositionScale(HodographCenter[0], HodographCenter[1], Canv);
 
  
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.setLineDash([4,4]);
  ctx.moveTo(0, Center.y/2 );
  ctx.lineTo(Canv.width, Center.y/2);
  ctx.stroke();
  ctx.beginPath();
  ctx.setLineDash([4,4]);
  ctx.moveTo(Center.x/2, 0);
  ctx.lineTo(Center.x/2, Canv.height);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  //ctx.fillRect(0, Center.y/2 -1, Canv.width, 2);

  
  ctx.setLineDash([4,4]);
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  
  for (let i = 10; i < 200; i+=10){
     ctx.beginPath();
    ctx.arc(Center.x/2, Center.y/2, i * Scale/10, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = "rgba(200,200,200,1)";
	ctx.textAlign = "left";
    ctx.fillText(i, Center.x/2 + i * Scale/10 -5 , Center.y/2 +	3 +10);
	ctx.fillText(i, Center.x/2 - i * Scale/10 -5 , Center.y/2 +	3 +10);
	ctx.textAlign = "center";
	ctx.fillText(i, Center.x/2 + 10, Center.y/2 - i * Scale/10 + 3);
    ctx.fillText(i, Center.x/2 + 10, Center.y/2 + i * Scale/10 + 3);
     ctx.closePath();
  }
  
ctx.setLineDash([]);
  
  


  //DrawHodograph
  
  //let Start = ConvertPolartoCart(Sounding.W[0]);
  ctx.fillStyle = "rgba(225,0,0,1)";
  ctx.strokeStyle = "rgba(225,0,0,1)";
 
  //ctx.moveTo(Center.x, Center.y);

  ctx.lineWidth = 1.5;

 // ctx.lineStyle = "rgba(255,0,0,1)";
let Obj = Json.Sounding;
  for (let i = 0; i < Json.WWL-1; i++){
    

    if (Obj.H[i] >= 12000 || Obj.W[i].H >= 12000) {
      break;
    }

    if (Obj.W[i].WS == -9999 || Obj.W[i].WD == -9999){
      continue;
    }

    if (Obj.W[i].WS == NaN|| Obj.W[i].WD == NaN){
      continue;
    }

    let Hght = Obj.W[i].H;
    let HghtMax = Obj.W[i+1].H;

    if (HghtMax <= 1000 ){
      ctx.strokeStyle = "rgba(225,0,225,1)";
    } else if (HghtMax <= 3000 && HghtMax > 1000){
      ctx.strokeStyle = "rgba(225,0,0,1)";
    } else if (HghtMax <= 6000 && HghtMax > 3000){
      ctx.strokeStyle = "rgba(0,225,0,1)";
    } else if (HghtMax <= 9000 && HghtMax > 6000){
      ctx.strokeStyle = "rgba(225,225,0,1)";
    } else if (HghtMax <= 12000 && HghtMax > 9000){
      ctx.strokeStyle = "rgba(0,225,225,1)";
    }
    
    let Pos = ConvertPolartoCart(Obj.W[i]);
    let Pos2 = ConvertPolartoCart(Obj.W[i+1]);
    //console.log(Center.x + Pos.x, Center.y + Pos.y);
    
    ctx.beginPath();
    ctx.moveTo(Center.x/2 + Pos.x*(Scale/10), Center.y/2 + Pos.y*(Scale/10));
    ctx.lineTo(Center.x/2 + Pos2.x*(Scale/10), Center.y/2 + Pos2.y*(Scale/10));
    //ctx.moveTo(Center.x/2 + Pos2.x, Center.y + Pos2.y);
    ctx.stroke();
    ctx.fill();
  }
  ctx.stroke();
  ctx.fill();

  ctx.fillStyle = CSMot == Motions.RM && "rgba(255,255,255,1)" || "rgba(255,255,255,0.7)";
  ctx.textAlign = "left";
  ctx.fillText(`${BrmComps}kts RM`, Center.x/2 + BRM.RM.x*(Scale/10) + 5, Center.y/2 + BRM.RM.y*(Scale/10) + 10);
  
  ctx.fillStyle = CSMot == Motions.LM && "rgba(255,255,255,1)" || "rgba(255,255,255,0.7)";
  ctx.textAlign = "left";
  ctx.fillText(`${BlmComps}kts LM`, Center.x/2 + BRM.LM.x*(Scale/10) + 5, Center.y/2 + BRM.LM.y*(Scale/10) + 10);
  
  ctx.fillStyle = CSMot == CUMot && "rgba(255,255,255,1)" || "rgba(255,255,255,0.7)";
  ctx.textAlign = "left";
  ctx.fillText(`${CustomComps}kts CM`, Center.x/2 + CUMot.x*(Scale/10) + 5, Center.y/2 - CUMot.y*(Scale/10) + 10);

  ctx.strokeStyle = CSMot == Motions.RM && "rgba(255,0,0,0.9)" || "rgba(255,0,0,0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(Center.x/2 + BRM.RM.x*(Scale/10), Center.y/2 + BRM.RM.y*(Scale/10), 4,0,2*Math.PI);
  ctx.stroke();
  
  ctx.strokeStyle = CSMot == Motions.LM && "rgba(255,0,0,0.9)" || "rgba(255,0,0,0.5)";
  ctx.beginPath();
  ctx.arc(Center.x/2 + BRM.LM.x*(Scale/10), Center.y/2 + BRM.LM.y*(Scale/10), 4,0,2*Math.PI);
  ctx.stroke();
  
  ctx.strokeStyle = CSMot == CUMot && "rgba(255,0,0,0.9)" || "rgba(255,0,0,0.5)";
  ctx.beginPath();
  ctx.arc(Center.x/2 + CUMot.x*(Scale/10), Center.y/2 - CUMot.y*(Scale/10), 4,0,2*Math.PI);
  ctx.stroke();
  
  let hght0km = GetLayerByHght(Sounding, 0);
  let hght6km = GetLayerByHght(Sounding, 9000);

  let MM = MeanWindNW(Sounding, hght0km.P, hght6km.P, 1);
  
  ctx.strokeStyle = "rgba(200,100,50,1)";
  ctx.strokeRect(Center.x/2 + MM.x*(Scale/10), Center.y/2 + MM.y*(Scale/10), 6,6);
  ctx.fillStyle = "rgba(255,255,255,.5)";
  ctx.textAlign = "left";
  ctx.fillText(`${BlmComps}kts MM`, Center.x/2 + MM.x*(Scale/10)+10, Center.y/2 + MM.y*(Scale/10) + 10);
  
  if (CSMot == CUMot){
	  ctx.textAlign = "center";
	  ctx.fillStyle = "rgba(255,0,0,1)";
	  ctx.fillText(`Custom Motion Loaded`, Center.x/2 + CUMot.x*(Scale/10), Center.y/2 - CUMot.y*(Scale/10) + 185);
  }
  //ctx.fill();
 // ctx.closePath();
}

function DrawSkewNumbers(){
  const Canv = document.getElementById("skewTNumbers");
  const ctx = Canv.getContext("2d");

 // console.log(Canv.style);

  Canv.width = 800;//Canv.style.width;
  Canv.height = 45;

  ctx.font = `${Canv.width/40}px sans-serif`;

  for (let i = -50; i <= 50; i+=10){
    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.textAlign = "center";
    ctx.fillText(i, 0.9* GetSkewRatio(i) * Canv.width, Canv.height* 2/3);
  }
  
  ctx.fillRect(25, 1, 700, 1);
}

function PressuretoSkew(N,BP){
  var scl1 = Math.log(1050) - Math.log(100);
  var scl2 = Math.log(1050) - Math.log(N);
  return (skv.bry - (scl2/scl1) * (skv.bry - skv.tly))/skv.bry;
  //return Math.log10(10 - 9 *( (1050 - N) / 950));
}

function LevelToSkewNum(N, BP){
  return 0.5 - 0.5 * Lerp(0, 1, PressuretoSkew(N));
}

function FloorTo(N, V){
  return Math.floor(N / V) * V;
}

function RoundTo(N, V){
  return Math.round(N / V) * V;
}

function LapseRatePres(Sounding, PBot, PTop){
  let S = GetLayerByPres(Sounding, "SFC");
  
  if (S.P < PBot){
	  return "--";
  }
	
  let Bot = GetLayerByPres(Sounding, PBot);
  let Top = GetLayerByPres(Sounding, PTop);

  return Math.round(10 * (Top.VT - Bot.VT)/((Bot.H - Top.H) * 1/1000))/10;
}

function LapseRateHght(Sounding, hb, ht){
  let Bot = GetLayerByHght(Sounding, hb);
  let Top = GetLayerByHght(Sounding, ht);
  
  console.log(Bot, Top);
	let N = Math.round(10 * ((Top.VT - Bot.VT)/((Bot.H - Top.H) * 1/1000)))/10;
	
	if (N != N){
		return "--";
	}
  return N;
}

const ZEROCNK = 273.15;
const ROCP   = 0.28571426;
const GRAVITY = 9.81;
const eps = 0.62197;

let ParcelFunctions = {
  
}
function Wobf(temp){
  let x = temp - 20.0;
  if (x <= 0.0) {
    pol = 1.0 + x * (-8.841660499999999E-03 + x * ( 1.4714143E-04
              + x * (-9.671989000000001E-07 + x * (-3.2607217E-08
              + x * (-3.8598073E-10)))));
    pol = pol * pol;
    return 15.13 / (pol * pol);
    }
  else {
    pol = x * (4.9618922E-07 + x * (-6.1059365E-09 +
          x * (3.9401551E-11 + x * (-1.2588129E-13 +
          x * (1.6688280E-16)))));
    pol = 1.0 + x * (3.6182989E-03 + x * (-1.3603273E-05 + pol));
    pol = pol * pol;
    return 29.93 / (pol * pol) + 0.96 * x - 14.8;
    }
  } 

function VaporPressure(temp) {
  if (!qc(temp)) return RMISSD;

  pol = temp * (1.1112018E-17 + temp * (-3.0994571E-20));
  pol = temp * (2.1874425E-13 + temp * (-1.789232E-15 + pol));
  pol = temp * (4.3884180E-09 + temp * (-2.988388E-11 + pol));
  pol = temp * (7.8736169E-05 + temp * (-6.111796E-07 + pol));
  pol = 0.99999683E-00 + temp * (-9.082695E-03 + pol);
  pol = pol * pol;
  pol = pol * pol;
  return 6.1078 / (pol * pol);
}


function qc(val) {
  if (val < -998.0 || val > 2.0E+05) return 0;
  return 1;
}

function SatVapPres(t){
  return 611.2 * Math.exp((17.27*t)/(t+237.3));
}

function MixingRatio(vapprs, prs, molWeight=0.62198){
  return molWeight * (vapprs/(prs-vapprs))
}

function SaturationMixingRatio(tp, t){
  return MixingRatio(SatVapPres(t), tp);
}

function GetMoistLapse(l, t, td, p){
  let dl = drylift(p, t, td);
  let plcl = dl[0];
  let tlcl = dl[1];

  let r = [];
  
  for(let i =0; i < l.length; i++) {
	//t2 = tlcl
	let t3 = wetlift(plcl, tlcl, l[i].P);
    //let t3 = wetlift(p, t, l[i].P);
    r.push(virtemp(l[i].P, t3, t3));
  }
  
  /*for (let i =0; i < l.length; i++){
    r.push(WetLift(p, t, l[i].P));//l[i].P));
  }*/
  


  return r
}

function mixratio(pres, temp) {
  if (!qc(pres) || !qc(temp)) return RMISSD;

  x = 0.02 * (temp - 12.5 + 7500.0 / pres);
  wfw = 1.0 + 0.0000045 * pres + 0.0014 * x * x;
  fwesw = wfw * VaporPressure(temp);
  return 621.97 * (fwesw / (pres - fwesw));
  }

function drylift(p1, t1, td1) {
  p2 = -9999;
  t2 = -9999;

  if (!(!qc(p1) || !qc(t1) || !qc(td1))) {
    t2 = lcltemp(t1, td1);
    p2 = thalvl(theta(p1, t1, 1000), t2);
   }
  return Array(p2, t2);
}


function lcltemp(temp, dwpt) {
	if (!qc(temp) || !qc(dwpt)) return RMISSD;
	
	s = temp - dwpt;
	dlt = s * (1.2185 + 0.001278 * temp + s * (-.00219 + 1.173E-05 *
	      s - .0000052 * temp));
	return temp - dlt;
}

function thalvl(thta, temp) {
	if (!qc(temp || !qc(thta))) return RMISSD;
	
	temp = temp + 273.15;
	thta = thta + 273.15;
	return 1000.0 / Math.pow((thta/temp), (1/ROCP));
}

function theta(pres, temp, pres2) {
	if (!qc(pres) || !qc(temp)) return RMISSD;
	
	temp = temp + 273.15;
	return (temp * Math.pow(pres2 / pres, ROCP)) - 273.15;
}

function virtemp(pres, temp, dwpt) {
  if (!qc(dwpt)) return temp;
  if (!qc(temp) || !qc(pres)) return RMISSD;

  cta = 273.15;
  tk = temp + cta;
  w = 0.001 * mixratio(pres, dwpt);
  return (tk * (1.0 + w/eps) / (1.0 + w) - cta);
}

function GetDryLapse(l, ST, P){
  let r = []
  let lr = 9.8;

  let dl = drylift(ST.P, ST.T, ST.D);
  let plcl = dl[0];
  let tlcl = dl[1];

  let T = virtemp(P[0], P[1], P[1]);
  
  for (let i = 0; i < l.length; i++){
    let v = l[i];
    //r.push(drylift(pLCL[0], t, td)[1]);
    r.push(Lerp(ST.VT, T, (i/(l.length-1))));
    //r.push(Lerp(t, pLCL.t2, 1-((v.P-pLCL.p2)/(p-pLCL.p2))));
  }
  
  //r.push(T);
  
  return r;
}

function CtoK(N){
  return N + 273.15;
}

function KtoC(N){
  return N - 273.15;
}


function wetlift(pres, temp, pres2) {
  if (!qc(pres) || !qc(temp) || !qc(pres2)) return RMISSD;

  tha = theta(pres, temp, 1000);
  woth = Wobf(tha);
  wott = Wobf(temp);
  thm = tha - woth + wott;
  return satlft(pres2, thm);
 }

function satlft(pres, thm) {
  if (!qc(pres) || !qc(thm)) return RMISSD;

  if ((Math.abs(pres - 1000) - .001) <= 0) return thm;

  eor = 999;
  while (Math.abs(eor) - 0.1 > 0) {
    if (eor == 999) {
      pwrp = Math.pow(pres / 1000, ROCP);
      t1 = (thm + 273.15) * pwrp - 273.15;
      woto = Wobf(t1);
      wotm = Wobf(thm);
      e1 = woto - wotm;
      rate = 1;
      }
    else {
      rate = (t2-t1)/(e2-e1);
      t1 = t2;
      e1 = e2;
      }
    t2 = t1 - e1 * rate;
    e2 = (t2 + 273.15) / pwrp - 273.15;
    wot2 = Wobf(t2);
    woe2 = Wobf(e2);
    e2 = e2 + wot2 - woe2 - thm;
    eor = e2 * rate;
    }
  return t2 - eor;
}  

function mean_theta(Sounding, pb, pt){
	let Tt = 0;
	let Cout = 0;
	
	for (let i=pb; pt<=i;i-=1){
		let Slice = GetLayerByPres(Sounding, i);
	
		Tt += theta(Slice.P, Slice.T, 1000);
		Cout += 1;
	}
	Tt/=Cout;
	
	//Tt /= 2;
	//Tt /= Cout*0.5;
	return Tt;
}

function thetae(p, t, td){
	let P = drylift(p, t, td);
	return theta(100, wetlift(P[0], P[1], 100), 1000);
}

function mean_thetae(Sounding, pb, pt){
	let Tt = 0;
	let Cout = 0;
	
	for (let i=pb; pt<=i;i-=1){
		let Slice = GetLayerByPres(Sounding, i);
	
		Tt += thetae(Slice.P, Slice.T, Slice.D);
		Cout += 1;
	}
	
	Tt /= 2;
	Cout /= 2;
	
	Tt /= Cout;
	return Tt;
}

function mean_mixratio(Sounding, pb, pt){
	let Cout = 0;
	let Dwpt = 0;
	let Pres = 0;
	
	for (let i=pb; pt<=i;i-=1){
		let Slice = GetLayerByPres(Sounding, i);
		
		Cout += 1;
		Pres += i;
		Dwpt += Slice.D;
	}
	
	Dwpt /= 2;
	Pres /= 2;
	Cout /= 2;
	
	return mixratio(Pres/Cout, Dwpt/Cout);
}

function LiftParcel(Sounding, type, start){
  let ReturnTable = {
    Path : [],
    Cape : 0,
    Cape3 : 0,
    Cape6 : 0,
    HGZCape : 0,
    PreHGZCape : 0,
    CINH : 0,
    LCL : -9999,
    LFC : -9999,
    EL : -9999,
    MPL: 16000,
    Levels: 0,
    Start: null,
  }

  let StartSlice  = GetLayerByPres(Sounding, "SFC");
  let EndSlice = GetLayerByPres(Sounding, "Last");
  
  if (type == "SB"){
    StartSlice = GetLayerByPres(Sounding, "SFC");//"SFC");//"SFC");
  } else if (type == "ML"){
    let pbot = GetLayerByPres(Sounding, "SFC").P;
	let ptop = pbot-100;
    let mtheta = mean_theta(Sounding, pbot, ptop);
    let tmpc = theta(1000., mtheta, pbot);
    let mmr = mean_mixratio(Sounding, pbot, ptop);
    let dwpc = temp_at_mixrat(mmr, pbot);
	  
    StartSlice = GetLayerByPres(Sounding, "SFC");

	StartSlice.P = pbot;
	StartSlice.D = dwpc;
	StartSlice.T = tmpc;
	StartSlice.VT = virtemp(pbot, tmpc, tmpc);
  } else if (type == "MU"){
	let P = 950;
	let TMax = 0;
	let Strt = GetLayerByPres(Sounding, "SFC");
	
	for (let i=Strt.P; Math.max(300, EndSlice.P) <= i; i-=1){
		let sce = GetLayerByPres(Sounding, i);		
		let TTa = CtoK(thetae(sce.P, sce.T, sce.D));
		
		if (TMax <= TTa){
			P = i;
			TMax = TTa;
		}
	}
	
    StartSlice = GetLayerByPres(Sounding, P);
  } else {
	StartSlice = GetLayerByPres(Sounding, Math.min(StartSlice.P,start));
  }


  ReturnTable.Start = StartSlice;
  
  //MU Parcel
  let Lower = [];
  let Upper = [];
  let TSounding = [];
  let levels = 0;

  let P = drylift(StartSlice.P, StartSlice.T, StartSlice.D);

  let Iter = 1;

  for (let i = StartSlice.P; EndSlice.P <= i; i-=Iter){
    let Slice = GetLayerByPres(Sounding, i);
    TSounding.push(Slice);

    if (Slice.P > StartSlice.P){
      levels += 1;
    } else {
      if (Slice.P >= Math.round(P[0])){
        Lower.push(Slice);
      } else {
        Upper.push(Slice);
      }
    }
  }

  ReturnTable.LCL = Math.max(RoundTo(1000*(StartSlice.T - StartSlice.D) / 7.83, 1), 20); //+ StartSlice.H;
  
  if (ReturnTable.LCL > EndSlice.H){
	  return {
		Path : false,
		Cape : 0,
		Cape3 : 0,
		Cape6 : 0,
		HGZCape : 0,
		PreHGZCape : 0,
		CINH : 0,
		LCL : -9999,
		LFC : -9999,
		EL : -9999,
		MPL: -9999,
		Levels: 0,
		Start: null,
	  }
  }
 // console.log(ReturnTable.LCL);
  let EnvTempLCL = P[1]//StartSlice.T - (9.81 * (ReturnTable.LCL/1000));

  let LCLP = GetLayerByHght(Sounding, ReturnTable.LCL);
  let LowerT = GetDryLapse(Lower, StartSlice, P);
  let UpperT = GetMoistLapse(Upper, StartSlice.T, StartSlice.D, StartSlice.P)//StartSlice.P)//(virtemp(LCLP.P, N22, StartSlice.D) || StartSlice.VT),StartSlice.D, StartSlice.P);

  let Rtn = [];
  
  for (var N of LowerT){
    Rtn.push(N);
  }

  for (var N of UpperT){
    Rtn.push(N);
  }

  for (let i=0; i < Rtn.length; i++){
    ReturnTable.Path[i + levels] = Rtn[i];
  }
  
  let FoundEL = false;
  
  let pe3 = P[0];
  let pe2 = P[1];
  let tp1 = virtemp(StartSlice.P, StartSlice.T, StartSlice.D)
  let SP = - StartSlice.H;
  
  for (let i= ReturnTable.LCL; (EndSlice.H - ReturnTable.LCL-20) > i; i+=20){
	  if (i >= EndSlice.H){
		  break;
	  }
	 
	  let lyr = GetLayerByHght(Sounding, i );
	 
	  //LCLTemp = wetlift(pe2, LCLTemp, P[0]);
	  let LCLTemp = wetlift(pe3, pe2, lyr.P);
	  
	  
	  
	  let LCLVirT = virtemp(lyr.P, LCLTemp, LCLTemp);
	  let OT = virtemp(lyr.P, lyr.T, lyr.T)
	  if (LCLVirT >= OT){
		  ReturnTable.LFC = Math.max(ReturnTable.LCL, RoundTo(i,20));
		  break;
	  }
  }
  
  if (ReturnTable.LFC == -9999 && type == "EFF"){
	  return false;
  }

  ReturnTable.EL = 999999;
  
  let Floor2nd = null;
  let MPLC = 0;

  for (let i =ReturnTable.Path.length-1; 0 < i; i--){
    let N = TSounding[i];

    if (ReturnTable.Path[i] >= N.T && N.H >= ReturnTable.LFC && N.H >= ReturnTable.LCL){
      let NP = TSounding[i-1];
	  
	  if (NP.T == N.T){
		  ReturnTable.EL = NP.H;
		  break;
	  }
	  
	  let Lrp = Lerp(NP.H, N.H, clamp((ReturnTable.Path[i] - N.T)/(NP.T - N.T),0,1));

	  ReturnTable.EL = Lrp;
      break;
    }
  }

  for (let i =0; i < ReturnTable.Path.length-1; i++){
    let N = TSounding[i];
    let N2 = TSounding[i+1];

    if (N.H < ReturnTable.EL){
	
      if (Floor2nd == null && (N.H >= ReturnTable.LFC)){
        Floor2nd = N;
      }
      
      if ((ReturnTable.Path[i] - N.VT) >= 0 && (N.H >= ReturnTable.LFC)){
        let HPart = (N2.H - N.H);

        let B1 = (ReturnTable.Path[i] - N.VT)/CtoK(N.VT);
        let B2 = (ReturnTable.Path[i+1] - N2.VT)/CtoK(N2.VT);
        
        ReturnTable.Cape += GRAVITY * ((B1+B2)/2 * HPart);

        if (N.H <= 6000){
          ReturnTable.Cape6 += GRAVITY * ((B1+B2)/2 * HPart);
        } 

        if (N.H <= 3000){
          ReturnTable.Cape3 += GRAVITY * ((B1+B2)/2 * HPart);
        }

        if (N.T >= -30 && N.T <= -10){
          ReturnTable.HGZCape += GRAVITY * ((B1+B2)/2 * HPart);
        } else if (N.T > -10){
          ReturnTable.PreHGZCape += GRAVITY * ((B1+B2)/2 * HPart);
        }
        
        //(0.5*((B1+B2))) * HPart;
      // ReturnTable.Cape += GRAVITY * (CapePart)*HPart;
      } else if ((ReturnTable.Path[i] - N.VT) < 0 && (N.H < ReturnTable.LFC)) {
        let HPart = (N2.H - N.H);

        let B1 = (N.VT - ReturnTable.Path[i])/CtoK(N.VT);
		let B2 = (N2.VT -ReturnTable.Path[i+1])/CtoK(N2.VT);

        ReturnTable.CINH -= Math.abs(GRAVITY * ((B1+B2) * HPart));
      }

      if (type == "EFF" && ReturnTable.Cape >= 100 && ReturnTable.CINH >= -250){
        return true;
      }

      if (type == "EFF" && ReturnTable.CINH < -250){
        return false;
      }
    } else if (N.H >= ReturnTable.EL){
      let HPart = (N2.H - N.H);

      let B1 = (ReturnTable.Path[i] - N.VT)/CtoK(N.VT);
      let B2 = (ReturnTable.Path[i+1] - N2.VT)/CtoK(N2.VT);

      MPLC += Math.abs(GRAVITY * ((B1+B2)/2 * HPart));

      if (MPLC - ReturnTable.Cape < 0){
        ReturnTable.MPL = N.H;
      }

      if (type == "EFF"&& ReturnTable.Cape >= 100 && ReturnTable.CINH >= -250){
        return true;
      } else if (type == "EFF" && ReturnTable.CINH < -250){
		return false;
	  }
    }
  }
  
  return ReturnTable;
}

var Barbs = {};
let iterbb = 0;

var preload = [
  {id: "calm", url: "Images/calm.png"},
  {id: "k5", url: "Images/5.png"},
  {id: "k10", url: "Images/10.png"},
  {id: "k50", url: "Images/50.png"},
];

preload.forEach((p) => {
  const n = new Image()
  n.src = p.url;

  n.onload = () => {
    Barbs[p.id] = n;
    iterbb++;

    if (iterbb == preload.length) {
      
    }
  }
});

function GetSkewRatio(N){
  return ((N+50)/102 + 0.01);
}

function rotate(x, y, sx, sy, angle, func) {
  const Canv = document.getElementById("barbs");
  const ctx = Canv.getContext("2d");
  
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(DegToRad(angle) + Math.PI);

  func();

  ctx.restore();
}

function BarbColor(N){
  let ColorIndex = [
    "rgba(100,100,255,1)",
    "rgba(0,125,255,1)",
    "rgba(0,255,0,1)",
    "rgba(255,255,0,1)",
    "rgba(255,125,0,1)",
    "rgba(255,0,0,1)",
    "rgba(255,0,125,1)",
    "rgba(255,0,255,1)",
    "rgba(125,0,255,1)",
    "rgba(0,0,255,1)",
    "rgba(125,125,125,1)",
    "rgba(255,255,255,1)",
  ];

  return ColorIndex[Math.min(Math.floor(N/10),110)];
}

function drawBarb(params) {
  const Canv = document.getElementById("barbs");
  const ctx = Canv.getContext("2d");

  let barbColor = BarbColor(params[5]);

  let wdir = params[4];
  let wspd = params[5];

  let siz = 1;
  let x = 50;
  let y = 0.05 + 0.99 * Canv.height * (PressuretoSkew(params[0]));

  ctx.fillStyle = barbColor;
  ctx.strokeStyle = barbColor;

  if (!qc(wdir) || !qc(wspd)) return RMISSD;
  ctx.beginPath();

  let Polar = ConvertPolartoCart({WS:1, WD:(-wdir)});
  
  var dx = 50 * Polar.x * (siz / 1.5);
  var dy = 50 * Polar.y * (siz / 1.5);


  var x1 = x;
  var y1 = y;
  var x2 = x1 + dx;
      var y2 = y1 - dy;

      // Draw backbone of wind barb, along with origin dot 
      ctx.rect(x1-1, y1-1, 2, 2);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);

  var sped = wspd;
      x1 = x2;
      y1 = y2;

      var wid = 7;                        // Number of flags that will fit 
      var spcx = dx / wid;
      var spcy = dy / wid;
      x1 = x1 + spcx;
      y1 = y1 - spcy;

      // Draw wind flags (increments of 50kt) 
      var flag = 0;
  ctx.fillStyle = ctx.strokeStyle;
  //console.log(wdir + " " + wspd + " " + ctx.strokeStyle + " " + x + " " + y);
      while (sped > 50) {
       flag = 1;
             x1 = x1 - spcx;
             y1 = y1 + spcy;
             var hgt = .5;                   // Height of flags
             x2 = x1 + (dy * hgt);
             y2 = y1 + (dx * hgt);
             x3 = x1 - spcx;
             y3 = y1 + spcy;
             ctx.moveTo(x1, y1);
             ctx.lineTo(x2, y2);
             ctx.lineTo(x3, y3);
      ctx.closePath();
      ctx.fill();
             x2 = (x1 + x2 + x3) / 3;
             y2 = (y1 + y2 + y3) / 3;
             sped -= 50;
             x1 = x3;
             y1 = y3;
          }

  // Draw wind barbs (increments of 5kt)
      while (sped > 10) {
             hgt = .5;                   // Height of flags
             x2 = x1 + (dy * hgt);
             y2 = y1 + (dx * hgt);
             x3 = x1 - spcx;
             y3 = y1 + spcy;
             ctx.moveTo(x3, y3);
             ctx.lineTo(x2, y2);
             sped -= 10;
             x1 = x3;
             y1 = y3;
          }
  
    // Draw short barb
        if (sped >= 5) {
               hgt = .5;                   // Height of flags
               x2 = x1 + (dy * hgt);
               y2 = y1 + (dx * hgt);
               x3 = x1 - spcx;
               y3 = y1 + spcy;
               dx = (x3 - x2) / 2;
      dy = (y3 - y2) / 2;
      x2 = x3 - dx;
      y2 = y3 - dy;
      ctx.moveTo(x3, y3);
      ctx.lineTo(x2, y2);
    }
  
    ctx.stroke();
  
}

function DrawBarbs(Sounding){
  const Canv = document.getElementById("barbs");
  const ctx = Canv.getContext("2d");

  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.fillRect(0,0,1000,1000);


  Canv.height = 800;
  Canv.width = 100;//Canv.style.width;

  const Center = GetPositionScale(50, 50, Canv);

  /*for (let i = 950; 110 <= i; i-=50){
    let Layer = GetLayerByPres(Sounding.Sounding, i);

    drawBarb(ConvertToRaw(Layer));
  }*/

  for (let i = 1; i < Math.floor(Sounding.TWL/2); i+=1){
    drawBarb(Sounding.Sounding.Slice[i]);
  }

  for (let i = Math.floor(Sounding.TWL/2); i < Sounding.TWL; i+=2){
    drawBarb(Sounding.Sounding.Slice[i]);
  }
};

function FtoC(N){
  return (N - 32) * (5/9);
}

function CToF(N){
  return (N * (9/5)) + 32;
}

function MixRatioLine(val){
  const Canv = document.getElementById("skewT");
  const ctx = Canv.getContext("2d");
  
  ptop = 600;
  pbot = 1045;

  temp = temp_at_mixrat(val, pbot);
  x0 =  Canv.width * (GetSkewRatio(temp) + LevelToSkewNum(pbot));
  y0 = pres_to_pix(pbot);

  temp = temp_at_mixrat(val, ptop);
  x1 = Canv.width * (GetSkewRatio(temp) + LevelToSkewNum(ptop));
  y1 = pres_to_pix(ptop);

  ctx.save();
  ctx.beginPath();
  ctx.setLineDash([2, 2]);
  ctx.strokeStyle = "rgba(4,125,4,1)";
  ctx.lineWidth = 3;
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);

  
  

  ctx.stroke();
  ctx.fillStyle = 'rgba(45, 200, 45, 1)';
  ctx.textAlign = "center";
  ctx.fillText(`${val}`, x1, y1);
  ctx.restore();
  
}

function DrawLine(Sounding, type){
  const Canv = document.getElementById("skewT");
  const ctx = Canv.getContext("2d");

  let Sound = Sounding.Sounding;
  let LoopVar;
  let Loop;
  let EndVar;

  let Layers = [];
  
  if (type == "Dew"){
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,255,0,1)";
    
    Loop = Sound.DW;
    LoopVar = Sounding.DWL;
    EndVar = "D";
  } else if (type == "Temp"){
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255,0,0,1)";

    Loop = Sound.TW;
    LoopVar = Sounding.TWL;
    EndVar = "T";
  } else if (type == "VTemp"){
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255,0,0,0.7)";

    Loop = Sound.TW;
    LoopVar = Sounding.TWL;
    EndVar = "VT";
  } else if (type == "WetBulb"){
	ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(0,200,200,1)";

    Loop = Sound.TW;
    LoopVar = Sounding.TWL;
    EndVar = "WB";
  }

  
  
  ctx.beginPath();
  if (type == "VTemp"){
    ctx.setLineDash([5,5]);
  } else {
    ctx.setLineDash([]);
  }

  
  //ctx.lineTo(dxx, dyy);

  for (let i = 0; i < LoopVar-1; i++){
    if (Loop[i].P < 100) {
      break;
    }

    let OBJ = Loop[i];
    let OBJ2 = Loop[i+1];

    //let PosX = temp_to_pix(OBJ[EndVar], OBJ.P);
    //let PosY = pres_to_pix(OBJ.P);

    //let PosX2 = temp_to_pix(OBJ2[EndVar], OBJ2.P);
    //let PosY2 = pres_to_pix(OBJ2.P);

    let PosX = LevelToSkewNum(OBJ.P, Loop[0].P);
    let PosY = PressuretoSkew(OBJ.P, Loop[0].P);
    let Ratio = GetSkewRatio(OBJ[EndVar]);
   
    let PosX2 = LevelToSkewNum(OBJ2.P, Loop[0].P);
    let PosY2 = PressuretoSkew(OBJ2.P, Loop[0].P);
    let Ratio2 = GetSkewRatio(OBJ2[EndVar]);

    ctx.moveTo((Ratio + PosX) * Canv.width, PosY * Canv.height);
    ctx.lineTo((Ratio2 + PosX2) * Canv.width, PosY2 * Canv.height);
    //ctx.moveTo(Center.x/2 + Pos2.x, Center.y + Pos2.y);
    

    if (type == "Temp"){
      if (Loop[Math.max(1,i)].T >= -30 && Loop[Math.min(LoopVar,i)].T <= -10){
        Layers.push(Loop[i]);
        
      } else {
        ctx.strokeStyle = "rgba(255,0,0,1)";
      }
    }
  }

  ctx.stroke();
  ctx.fill();

  if (Layers.length > 0){
    let Start = GetLayerByTemp(Sound, -10);
    let End = GetLayerByTemp(Sound, -30);

    let SfcSlice = ConvertToInfo(Sound.Slice[1]);
    
    let PX = LevelToSkewNum(Start.P, SfcSlice.P);
    let PY = PressuretoSkew(Start.P, SfcSlice.P);
    let Rio = GetSkewRatio(-10);

    let PX2 = LevelToSkewNum(Layers[0].P, SfcSlice.P);
    let PY2 = PressuretoSkew(Layers[0].P, SfcSlice.P);
    let Rio2 = GetSkewRatio(Layers[0].T);

    ctx.strokeStyle = "rgba(255,175,126,1)";
    ctx.lineWidth = 4;

    ctx.strokeStyle = "rgba(255,175,126,1)";
    ctx.beginPath();

    ctx.moveTo((Rio + PX) * Canv.width, PY * Canv.height);
    ctx.lineTo((Rio2 + PX2) * Canv.width, PY2 * Canv.height);
    //ctx.moveTo(Center.x/2 + Pos2.x, Center.y + Pos2.y);

    
    
    for (let i = 0; i < Layers.length-1; i++){
      let Obj = Layers[i];
      let Obj2 = Layers[i+1];
      
      let PosX = LevelToSkewNum(Obj.P, SfcSlice.P);
      let PosY = PressuretoSkew(Obj.P, SfcSlice.P);
      let Ratio = GetSkewRatio(Obj.T);

      let PosX2 = LevelToSkewNum(Obj2.P, SfcSlice.P);
      let PosY2 = PressuretoSkew(Obj2.P, SfcSlice.P);
      let Ratio2 = GetSkewRatio(Obj2.T);

      
      ctx.moveTo((Ratio + PosX) * Canv.width, PosY * Canv.height);
      ctx.lineTo((Ratio2 + PosX2) * Canv.width, PosY2 * Canv.height);
      //ctx.moveTo(Center.x/2 + Pos2.x, Center.y + Pos2.y);

    }

    let PsX = LevelToSkewNum(Layers[Layers.length-1].P, SfcSlice.P);
    let PsY = PressuretoSkew(Layers[Layers.length-1].P, SfcSlice.P);
    let Rtio = GetSkewRatio(Layers[Layers.length-1].T);

    let PsX2 = LevelToSkewNum(End.P, SfcSlice.P);
    let PsY2 = PressuretoSkew(End.P, SfcSlice.P);
    let Rtio2 = GetSkewRatio(-30);

    ctx.strokeStyle = "rgba(255,175,126,1)";
    ctx.moveTo((Rtio + PsX) * Canv.width, PsY * Canv.height);
    ctx.lineTo((Rtio2 + PsX2) * Canv.width, PsY2 * Canv.height);
    //ctx.moveTo(Center.x/2 + Pos2.x, Center.y + Pos2.y);
    ctx.stroke();
    ctx.fill();
  }
}

function dry_adiabat(thta) {
  const Canv = document.getElementById("skewT");
  const ctx = Canv.getContext("2d");
  
  ctx.beginPath();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  
  for (pres=1050; pres >= 70; pres-=10) {
   // temp = 2;
    temp = ((thta + 273.15) / Math.pow(1000 / pres, ROCP)) - 273.15;
    x = temp_to_pix(temp, pres);
    y = pres_to_pix(pres);	
    if (pres == 1050) {
      ctx.moveTo(x, y); 
    }else {
      ctx.lineTo(x, y);
   }
  }
  ctx.stroke();
}

function EffInflowCalc(Sounding, sfc){
  let Bot = 0;
  let Top = 999;
  let isSfc = false;
  let FoundBot = false;
  
  for (let i = sfc.P; 500 <= i; i-= 5){
    let N = LiftParcel(Sounding, "EFF", i);

    if (N == true && !FoundBot) {
      if (i == sfc.P){
        isSfc = true;
      }
      Bot = i;
      FoundBot = true;
	  break;
    }
  }
  
  for (let i = Bot-5; 500 <= i; i-=5){
	let N = LiftParcel(Sounding, "EFF", i);
	
	if (N == true && Bot != 0) {
      Top = i;
    } else {
	  Top -= 5;
	  break;
	}
  }

  if (Bot == 0){
    return false;
  }

  if (Top == 999){
    return false;
  }
  return {Bot, Top, isSfc};
}

function GetCapeColor(N){
	if (N <= 2000){
		return "rgba(255,255,255,1)";
	} else if (N <= 3000 && N > 2000){
		return "rgba(255,255,0,1)";
	} else if (N <= 4000 && N > 4000){
		return "rgba(255,0,0,1)";
	} else {
		return "rgba(255,0,255,1)";
	}
}

function Get3CapeColor(N){
	if (N <= 50){
		return "rgba(255,255,255,1)";
	} else if (N <= 100 && N > 50){
		return "rgba(255,255,0,1)";
	} else if (N <= 200 && N > 100){
		return "rgba(255,0,0,1)";
	} else {
		return "rgba(255,0,255,1)";
	}
}

function Get6CapeColor(N){
	if (N <= 400){
		return "rgba(255,255,255,1)";
	} else if (N <= 800 && N > 400){
		return "rgba(255,255,0,1)";
	} else if (N <= 1200 && N > 800){
		return "rgba(255,0,0,1)";
	} else {
		return "rgba(255,0,255,1)";
	}
}

function GetCinColor(N){
	if (N > -50){
		return "rgba(0,255,0,1)";
	} else if (N > -100){
		return "rgba(255,255,0,1)";
	} else if (N > -200){
		return "rgba(255,0,0,1)";
	} else {
		return "rgba(125,175,0,1)";
	}
}

function GetSCPColor(N){
	if (N <= 5){
		return "rgba(125,125,125,1)";
	} else if (N <= 8 && N > 5){
		return "rgba(255,255,255,1)";
	} else if (N <= 15 && N > 8){
		return "rgba(255,255,0,1)";
	} else if (N <= 25 && N > 15){
		return "rgba(255,0,0,1)";
	} else {
		return "rgba(255,0,255,1)";
	}
}

function GetSTPColor(N){
	if (N <= 1){
		return "rgba(125,125,125,1)";
	} else if (N <= 2 && N > 1){
		return "rgba(255,255,255,1)";
	} else if (N <= 3 && N > 2){
		return "rgba(255,255,0,1)";
	} else if (N <= 5 && N > 3){
		return "rgba(255,0,0,1)";
	} else {
		return "rgba(255,0,255,1)";
	}
}

function DrawValuesKey(){
  const Canv = document.getElementById("Values1");
  const ctx = Canv.getContext("2d");

  Canv.width = 700;
  Canv.height = 200;

  let Scale = 1;
  let typeR = "Parcel";

  let Scaler = 0;

  ctx.fillStyle = "rgba(255,255,255,1)";

  ctx.fillRect(0.05 * Canv.width, 0.175 * Canv.height, 0.92 * Canv.width, 2);
  
  ctx.font = `bold ${Canv.width/30}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`Parcel`, Canv.width * (0.1 + Scaler/22), Canv.height * 0.15);

  Scaler += 3.2;

  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.font = `bold ${Canv.width/35}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`CAPE`, Canv.width * (0.1 + Scaler/22), Canv.height * 0.15);

  Scaler += 3;

  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.font = `bold ${Canv.width/35}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`3CAPE`, Canv.width * (0.1 + Scaler/22), Canv.height * 0.15);

  Scaler += 3;

  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.font = `bold ${Canv.width/35}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`6CAPE`, Canv.width * (0.1 + Scaler/22), Canv.height * 0.15);

  Scaler += 3;

  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.font = `bold ${Canv.width/35}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`CINH`, Canv.width * (0.1 + Scaler/22), Canv.height * 0.15);

  Scaler += 2;

  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.font = `bold ${Canv.width/35}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`LCL`, Canv.width * (0.1 + Scaler/22), Canv.height * 0.15);

  Scaler += 2;

  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.font = `bold ${Canv.width/35}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`LFC`, Canv.width * (0.1 + Scaler/22), Canv.height * 0.15);

  Scaler += 2;

  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.font = `bold ${Canv.width/35}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`EL`, Canv.width * (0.1 + Scaler/22), Canv.height * 0.15);

  Scaler += 2;
}

function DrawValues(type, Values, Selected=false){
  const Canv = document.getElementById("Values1");
  const ctx = Canv.getContext("2d");

  let Scale = 0;
  let typeR = "Parcel";
  let Scaler = 0;
  

  if (type == "SB"){
    Scale = 1.2;
    typeR = "Surface-Based";
  } else if (type == "ML"){
    Scale = 2.2;
    typeR = "Mixed-Layer";
  } else if (type == "MU"){
	Scale = 3.2;
    typeR = "Most Unstable"; 
  } else if (type == "CU"){
	Scale = 4.2;
    typeR = `Custom (${Math.round(CUPrcl.Start.P)}mb)`; 
  }

  if (Selected == true){
	ctx.strokeStyle = "rgba(255,255,255,0.9)";
	ctx.lineWidth = 2;
	ctx.strokeRect(Canv.width * (0.01 + Scaler/22), Canv.height * (0.165 + 0.2 * (Scale-1)), 0.975*Canv.width, 0.2*Canv.height);
  }

  ctx.font = `bold ${Canv.width/45}px sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText(`${typeR}`, Canv.width * (0.0125 + Scaler/22), Canv.height * (0.1 + 0.2 * Scale));

  Scaler += 3.2;

  ctx.fillStyle = GetCapeColor(Values.Cape);
  ctx.font = `${Canv.width/45}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`${Math.floor(Values.Cape)} J/kg`, Canv.width * (0.1 + Scaler/22), Canv.height * (0.1 + 0.2 * Scale));

  Scaler += 3;

  ctx.fillStyle = Get3CapeColor(Values.Cape3);
  ctx.font = `${Canv.width/45}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`${Math.floor(Values.Cape3)} J/kg`, Canv.width * (0.1 + Scaler/22), Canv.height * (0.1 + 0.2 * Scale));

  Scaler += 3;

  ctx.fillStyle = Get6CapeColor(Values.Cape6);
  ctx.font = `${Canv.width/45}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`${Math.floor(Values.Cape6)} J/kg`, Canv.width * (0.1 + Scaler/22), Canv.height * (0.1 + 0.2 * Scale));

  Scaler += 3;

  ctx.fillStyle = GetCinColor(Values.CINH);
  ctx.font = `${Canv.width/45}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`${Math.floor(Values.CINH)} J/kg`, Canv.width * (0.1 + Scaler/22), Canv.height * (0.1 + 0.2 * Scale));

  Scaler += 2;

  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.font = `${Canv.width/45}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`${Math.floor(Values.LCL)}m`, Canv.width * (0.1 + Scaler/22), Canv.height * (0.1 + 0.2 * Scale));

  Scaler += 2;

  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.font = `${Canv.width/45}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`${Math.floor(Values.LFC)}m`, Canv.width * (0.1 + Scaler/22), Canv.height * (0.1 + 0.2 * Scale));

  Scaler += 2;

  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.font = `${Canv.width/45}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`${Math.floor(Values.EL)}m`, Canv.width * (0.1 + Scaler/22), Canv.height * (0.1 + 0.2 * Scale));

  Scaler += 2;
}

var HodographCenter = [50,50]

function DrawInflowHodo(Sounding, Info, BRM){
  //console.log(Info);
  if (Info == false || Info.Top == 999){
    return;
  }
  
  const Canv = document.getElementById("hodograph");
  const ctx = Canv.getContext("2d");

  const Center = GetPositionScale(HodographCenter[0], HodographCenter[1], Canv);
  
  if (Info.isSfc == true){
	  Info.Bot = GetLayerByPres(Sounding, "SFC").P;
	  
	  
  }

  let BotLayer = GetLayerByPres(Sounding, Info.Bot);
  let TopLayer = GetLayerByPres(Sounding, Info.Top);
  
  console.log(BotLayer, Info);

  let Scale = 27;

  let Pos = ConvertPolartoCart({WS:BotLayer.WS,WD:BotLayer.WD});
  let Pos2 = ConvertPolartoCart({WS:TopLayer.WS,WD:TopLayer.WD});

  
  

  ctx.beginPath();
  ctx.fillStyle = "rgba(0,255,255,0.1)";
  ctx.lineWidth = 1;
ctx.strokeStyle = "rgba(0,255,255,1)";
  ctx.moveTo(Center.x/2 + CSMot.x*(Scale/10), Center.y/2 - CSMot.y*(Scale/10));
  ctx.lineTo(Center.x/2 + Pos.x*(Scale/10), Center.y/2 + Pos.y*(Scale/10));
  ctx.strokeStyle = "rgba(0,255,255,0)";
  let Obj = Sounding;
  console.log(Obj);

  
  for (let i = 0; i < Sounding.TW.length-1; i++){
    if (Obj.P[i+1] < TopLayer.P) {
      break;
    }

    if (Obj.W[i].WS == -9999 || Obj.W[i].WD == -9999){
      continue;
    }

    if (Obj.W[i].WS == NaN|| Obj.W[i].WD == NaN){
      continue;
    }

    let Hght = Obj.W[i].H;
    let HghtMax = Obj.W[i+1].H;

    let Pos = ConvertPolartoCart(Obj.W[i]);
    let Pos2 = ConvertPolartoCart(Obj.W[i+1]);
    //console.log(Center.x + Pos.x, Center.y + Pos.y);
    //ctx.moveTo(Center.x/2 + Pos.x*(Scale/10), Center.y/2 + Pos.y*(Scale/10));
    ctx.lineTo(Center.x/2 + Pos2.x*(Scale/10), Center.y/2 + Pos2.y*(Scale/10));
    //ctx.moveTo(Center.x/2 + Pos2.x, Center.y + Pos2.y);
  }
  
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(0,255,255,0.5)";
  //ctx.moveTo(Center.x/2 + BRM.x*(Scale/10), Center.y/2 + BRM.y*(Scale/10));
  ctx.lineTo(Center.x/2 + Pos2.x*(Scale/10), Center.y/2 + Pos2.y*(Scale/10));
  ctx.fill();
  //ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(Center.x/2 + CSMot.x*(Scale/10), Center.y/2 - CSMot.y*(Scale/10));
  ctx.lineTo(Center.x/2 + Pos2.x*(Scale/10), Center.y/2 + Pos2.y*(Scale/10));
  ctx.stroke();
  
  
  
  ctx.beginPath();
  ctx.moveTo(Center.x/2 + CSMot.x*(Scale/10), Center.y/2 - CSMot.y*(Scale/10));
  ctx.lineTo(Center.x/2 + Pos.x*(Scale/10), Center.y/2 + Pos.y*(Scale/10));
  ctx.stroke();
}

function DrawInflow(Sounding, Info){
  const Canv = document.getElementById("skewT");
  const ctx = Canv.getContext("2d");

  if(Info == false){
    return;
  }

  let BotLayer = GetLayerByPres(Sounding, Info.Bot);
  let TopLayer = GetLayerByPres(Sounding, Info.Top);
  
  ctx.fillStyle = "rgba(0,255,255,1)";

  let Y0 = PressuretoSkew(Info.Bot);
  let Y1 = PressuretoSkew(Info.Top);
  
  let SRH = GetSRH(Sounding, BotLayer.P, TopLayer.P, "Pres");

  ctx.fillRect(0.24 * Canv.width, Y0 * Canv.height, 0.05 * Canv.width, 2+0.005 * Canv.height);

  ctx.font = `${Canv.width/50}px sans-serif`;
  ctx.textAlign = "center";
  if (Info.isSfc){
    ctx.fillText(`SFC`, Canv.width * (0.2), Y0 * Canv.height);
  } else{
    ctx.fillText(`${Math.round(BotLayer.H)}m`, Canv.width * (0.2), Y0 * Canv.height);
  } 


  ctx.fillText(`${Math.round(TopLayer.H)}m`, Canv.width * (0.2), Y1 * Canv.height);
  
  ctx.textAlign = "left";
  ctx.fillText(`${Math.round(SRH.SRHP+SRH.SRHM)}m2s2`, Canv.width * (0.24), (Y1-0.01) * Canv.height);
  ctx.fillRect(0.265 * Canv.width, Y0 * Canv.height, 2, (Y1-Y0) * Canv.height);

  ctx.fillRect(0.24 * Canv.width, Y1 * Canv.height, 0.05 * Canv.width, 2+0.005 * Canv.height);
}
  
function GetSRH(Sounding, Hbot, Htop, type){
	let SRHP = 0;
	let SRHM = 0;
	
	let BM = CSMot;

	//BM.y = BM.y;
	
	if (type == "Pres"){
		for (let i = Hbot; i >= Htop; i--){
			let Sect1 = ConvertPolartoCart(GetLayerByPres(Sounding, i, "Wind"));
			let Sect2 = ConvertPolartoCart(GetLayerByPres(Sounding, i-1, "Wind"));
			Sect1.y = -Sect1.y;
			Sect2.y = -Sect2.y;
			
			let u1 = KTSTOM2(Sect1.y - BM.y);
			let v1 = KTSTOM2(Sect1.x - BM.x);
			
			let u2 = KTSTOM2(Sect2.y - BM.y);
			let v2 = KTSTOM2(Sect2.x - BM.x);
			
			let H = (u1 * v2) - (u2 * v1);
			
			if (H > 0){
				SRHP += H;
			} else {
				SRHM += H;
			}
		}
	} else if (type == "Hght"){
		for (let ir = Hbot; ir < Htop; ir+=10){
			let Sect1 = ConvertPolartoCart(GetLayerByHght(Sounding, ir));
			let Sect2 = ConvertPolartoCart(GetLayerByHght(Sounding, ir+10));
			Sect1.y = -Sect1.y;
			Sect2.y = -Sect2.y;
			
			let u1 = KTSTOM2(Sect1.y - BM.y);
			let v1 = KTSTOM2(Sect1.x - BM.x);
			
			let u2 = KTSTOM2(Sect2.y - BM.y);
			let v2 = KTSTOM2(Sect2.x - BM.x);
			
			let H = (u1 * v2) - (u2 * v1);

			if (H > 0){
				SRHP += H;
			} else {
				SRHM += H;
			}
		}
	}
	
	return {SRHP, SRHM};
}

function wetbulb(pres, tmp, dew){
	let P = drylift(pres, tmp, dew);
	return wetlift(P[0], P[1], pres);
}

function LapseRateColor(N){
	if (N == "--"){
		return "rgba(125,125,125,1)";
	}
	
	if (N < 5.5){
		return "rgba(125,125,125,1)";
	} else if (N >= 5.5 && N < 6){
		return "rgba(125,125,200,1)";
	}else if (N >= 6 && N < 6.5){
		return "rgba(75,255,75,1)";
	}else if (N >= 6.5 && N < 7){
		return "rgba(200,200,50,1)";
	}else if (N >= 7 && N < 7.5){
		return "rgba(200,100,0,1)";
	}else if (N >= 7.5 && N < 8){
		return "rgba(255,55,55,1)";
	}else if (N >= 8 && N < 9){
		return "rgba(255,0,125,1)";
	} else {
		return "rgba(255,255,255,1)";
	}
}

function GetLapseBox(Sounding){
	const Canv = document.getElementById("Values2");
	const ctx = Canv.getContext("2d");

	Canv.width = 400;//Canv.style.width;
	Canv.height = 250;
	
	let StartSlice = GetLayerByPres(Sounding, "SFC");
	
	let LLLR = LapseRateHght(Sounding, "SFC", 3000);
	let LSLR= LapseRateHght(Sounding,  "SFC", (DP.Start.H + DP.LCL) || 1000);
	let MLLR = LapseRateHght(Sounding, 3000, 6000);
	let MMR = LapseRatePres(Sounding, 700, 500);
	let LMR = LapseRatePres(Sounding, 850, 500);
	
	let Scale = .75;
	
	
	ctx.font = `bold ${Canv.width/15}px sans-serif`;
	

    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.textAlign = "left";
	ctx.fillText(`Sfc-3km LR`, 0.05*Canv.width, Canv.height * Scale/5);
	ctx.fillStyle = LapseRateColor(LLLR);
	ctx.textAlign = "right";
	ctx.fillText(`${LLLR} C/KM`, 0.95*Canv.width, Canv.height * Scale/5);
	Scale += 1;
	
	ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.textAlign = "left";
	ctx.fillText(`3km-6km LR`, 0.05*Canv.width, Canv.height * Scale/5);
	ctx.fillStyle = LapseRateColor(MLLR);
	ctx.textAlign = "right";
	ctx.fillText(`${MLLR} C/KM`, 0.95*Canv.width, Canv.height * Scale/5);
	Scale += 1;
	
	ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.textAlign = "left";
	ctx.fillText(`Sfc-LCL LR`, 0.05*Canv.width, Canv.height * Scale/5);
	ctx.fillStyle = LapseRateColor(LSLR);
	ctx.textAlign = "right";
	ctx.fillText(`${LSLR} C/KM`, 0.95*Canv.width, Canv.height * Scale/5);
	Scale += 1;
	
	ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.textAlign = "left";
	ctx.fillText(`850-500mb LR`, 0.05*Canv.width, Canv.height * Scale/5);
	ctx.fillStyle = LapseRateColor(LMR);
	ctx.textAlign = "right";
	ctx.fillText(`${LMR} C/KM`, 0.95*Canv.width, Canv.height * Scale/5);
	Scale += 1;
	
	ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.textAlign = "left";
	ctx.fillText(`700-500mb LR`, 0.05*Canv.width, Canv.height * Scale/5);
	ctx.fillStyle = LapseRateColor(MMR);
	ctx.textAlign = "right";
	ctx.fillText(`${MMR} C/KM`, 0.95*Canv.width, Canv.height * Scale/5);
	Scale += 1;
	
	
}

function clamp(n, m, a){
	return Math.max(Math.min(n, a), m);
}



function RelHum(tmp, dew){
	return 100 * VaporPressure(dew)/VaporPressure(tmp);//(E/ES)*100;
}

function GetParams(Info,Type){
	if (Type == "SCP"){
		let scp = 0;
		
		let EBWD = Info.Wnd.EBWD;
		
		if (EBWD > 20){
			EBWD = 20;
		} else if (EBWD < 10){
			EBWD = 0;
		}
		
		let mucapeT = Info.Parcels.MU.Cape/1000;
		let esrhT = Info.Wnd.ESRH/50;
		let ebwdT = EBWD/20;
		
		return Math.round(10 * mucapeT * esrhT * ebwdT)/10;
	} else if (Type == "STPF"){
		let sblcl = Info.Parcels.SB.LCL;
		
		if (sblcl < 1000){
			sblcl = 1;
		} else if (sblcl > 2000){
			sblcl = 0;
		} else {
			sblcl = (2000 - sblcl)/1000;
		}
		
		let bwd = Info.Wnd.EBWD;
		
		if (bwd > 30){
			bwd = 30;
		} else if (bwd < 12.5){
			bwd = 0;
		}
		
		bwd /= 20;
		let cape = Info.Parcels.SB.Cape/1500;
		let srh = (Info.Wnd.SRH01.SRHP+Info.Wnd.SRH01.SRHM)/150;
		
		return Math.round(10 * (cape * srh * bwd * sblcl))/10;
	} else if (Type == "STPC"){
		let cape = Info.Parcels.ML.Cape/1500;
		let srh = Info.Wnd.ESRH/150;
		
		let ebwd = Info.Wnd.EBWD;
		
		if (ebwd < 12.5){
			ebwd = 0;
		} else if (ebwd > 30){
			ebwd = 1.5;
		} else {
			ebwd = ebwd/20;
		}
		
		let mllcl = Info.Parcels.ML.LCL;
		
		if (mllcl < 1000){
			mllcl = 1;
		} else if (mllcl > 2000){
			mllcl = 0;
		} else {
			mllcl = (2000-mllcl)/1000;
		}
		
		let mlcin = Info.Parcels.ML.CINH;
		
		if (mlcin > -50){
			mlcin = 1;
		} else if (mlcin < -200){
			mlcin = 0;
		} else {
			mlcin = (mlcin + 200)/150;
		}
		
		return Math.round(10 * (cape * srh * ebwd * mllcl * mlcin))/10;
	} else if (Type == "SHIP"){
		let Mucape = Info.Parcels.MU.Cape;
		let ST = GetLayerByPres(Info.Sounding.Sounding, "SFC");
		let LR = LapseRatePres(Info.Sounding.Sounding, 700, 500);
		let BWD = clamp(Info.Wnd.EBWD,7,27);
		let MR = clamp(mixratio(ST.P, ST.D), 11, 13.6);
		let tmp500 = -Math.min(-5.5, GetLayerByPres(Info.Sounding.Sounding, 500).T);
		let Ship = (Mucape * LR * tmp500 * MR * BWD) / 42000000;
		
		if (Mucape<1300){
			Ship *= (Mucape/1300);
		}
		
		if (LR < 5.8){
			Ship *= (LR/5.8);
		}
		
		let FZL = GetLayerByTemp(Info.Sounding.Sounding, 0);
		
		
		if (FZL.H < 2400){
			Ship *= (FZL.H/2400)
		}
		
		return Math.round(10 * Ship)/10;
	} else if (Type == "WNDG"){
		let lr03 = LapseRateHght(Info.Sounding.Sounding, 0, 3000);
		
		if (lr03 < 7){
			lr03 = 0;
		}
		
		let mlcin = Info.Parcels.ML.CINH;
		
		if (mlcin < -50){
			mlcin = -50;
		}
		
		let cape = Info.Parcels.ML.Cape;
		console.log("A");
		let PB = GetLayerByHght(Info.Sounding.Sounding, 1000).P;
		let PT = GetLayerByHght(Info.Sounding.Sounding, 3500).P;
		let meanW = MeanWind(Info.Sounding.Sounding, PB, PT);
		
		meanW = Math.sqrt(Math.pow(meanW.x, 2) + Math.pow(meanW.y, 2));		
		
		return Math.round(10 * (lr03/9) * (50+mlcin)/40 * cape/2000 * meanW/15)/10;
	} else if (Type == "PWAT"){
		let Pwat = 0;
		let sfc = GetLayerByHght(Info.Sounding.Sounding, "SFC");
		
		for (let i = sfc.P; 400 <= i; i--){
			let S1 = GetLayerByPres(Info.Sounding.Sounding, i);
			let S2 = GetLayerByPres(Info.Sounding.Sounding, i-1);
			
			let MX = mixratio(S1.P, S1.D);
			let MX2 = mixratio(S2.P, S2.D);
			
			Pwat += ((MX + MX2)/2 * (S1.P - S2.P)) * 0.00040173;
		}
		
		return Math.round(100 * Pwat)/100;
	} else if (Type == "DerechoComp"){
		let PB = GetLayerByHght(Info.Sounding.Sounding, 0).P;
		let PT = GetLayerByHght(Info.Sounding.Sounding, 6000).P;
		let MeanW = MeanWind(Info.Sounding.Sounding, PB, PT);
		let meanW = Math.sqrt(Math.pow(MeanW.x, 2)+Math.pow(MeanW.y, 2));
		
		return Math.round(10 * (Info.TProf.DCapeProf.DCape/980) * (Info.Parcels.MU.Cape/2000) * (Info.Wnd.EBWD/20) * (meanW/16))/10;
	} else if (Type == "EHI1"){
		let cape = Info.Parcels.SB.Cape;
		
		return Math.round(10*(cape * (Info.Wnd.SRH01.SRHP + Info.Wnd.SRH01.SRHM))/160000)/10;
	} else if (Type == "EHI3"){
		let cape = Info.Parcels.SB.Cape;
		
		return Math.round(10*(cape * (Info.Wnd.SRH03.SRHP + Info.Wnd.SRH03.SRHM))/160000)/10;
	} else if (Type == "SigSvr"){
		return Math.round(Info.Parcels.ML.Cape * KTSTOM2(Info.Wnd.EBWD));
	} else if (Type == "ttadiff"){
		let PB = GetLayerByHght(Info.Sounding.Sounding, 0);
		let PT = GetLayerByHght(Info.Sounding.Sounding, 3000);
		let fTta = thetae(PB.P, PB.T, PB.D);
		let lTta = thetae(PT.P, PT.T, PT.D);
		
		return Math.round(fTta-lTta);
	}
}

function DrawInsetParams(Sounding, Wnd, TProf, SB, ML, MU){
	const Canv = document.getElementById("Values3");
	const ctx = Canv.getContext("2d");
	
	Canv.width = 800;
	Canv.height = 150;
	
	let Parcels = {SB, ML, MU};
	let Scalex = 0;
	let Scaley = 0.8;
	
	let Sfc = GetLayerByPres(Sounding.Sounding, "SFC");
	let Low = GetLayerByHght(Sounding.Sounding, 1000);
	let Mid = GetLayerByHght(Sounding.Sounding, 3000);
	
	let D = drylift(Sfc.P, Sfc.T, Sfc.D);
	
	let DCape = TProf.DCapeProf.DCape;
	
	let SCP = GetParams({Wnd, Parcels}, "SCP");
	let STPF = GetParams({Wnd, Parcels}, "STPF");
	let STPC = GetParams({Wnd, Parcels}, "STPC");
	let SHIP = GetParams({Wnd,Sounding, Parcels}, "SHIP");
	let WNDG = GetParams({Wnd,Sounding, Parcels}, "WNDG");
	let PWAT = GetParams({Sounding}, "PWAT");
	let ttadiff = GetParams({Sounding, Wnd, Parcels},"ttadiff");
	let MidRH = Math.round(RelHum(Mid.T, Mid.D));
	let FZL = Math.round(GetLayerByTemp(Sounding.Sounding, 0).H || "--");
	let MUMPL = Math.round(MU.MPL);
	let SfcRH = Math.round(RelHum(Sfc.T, Sfc.D));
	let LowRH = Math.round(RelHum(Low.T, Low.D));
	let DerechoComp = GetParams({Wnd, Sounding, Parcels, TProf}, "DerechoComp");
	let LCLTemp = Math.round(CToF(D[1]));
	let MMR = Math.round(100 * mean_mixratio(Sounding.Sounding, Sfc.P,Low.P))/100;
	let EHI01 = GetParams({Parcels, Wnd}, "EHI1");
	let SigSvr = GetParams({Parcels,Wnd},"SigSvr");
	let DownT = TProf.DCapeProf.DownT;
	
	let EHI03 = GetParams({Parcels, Wnd}, "EHI3");
	
	ctx.font = `bold ${Canv.width/55}px sans-serif`;
	
	ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.textAlign = "left";
	ctx.fillText(`PWAT:`, 0.02*Canv.width, Canv.height * Scaley/5);
	ctx.font = `${Canv.width/55}px sans-serif`;
	//ctx.fillStyle = LapseRateColor(MMR);
	ctx.textAlign = "right";
	ctx.fillText(`${PWAT} in`, 0.25*Canv.width, Canv.height * Scaley/5);
	Scaley += 1;
	
	ctx.font = `bold ${Canv.width/55}px sans-serif`;
	ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.textAlign = "left";
	ctx.fillText(`Sfc RH:`, 0.02*Canv.width, Canv.height * Scaley/5);
	//ctx.fillStyle = LapseRateColor(MMR);
	ctx.font = `${Canv.width/55}px sans-serif`;
	ctx.textAlign = "right";
	ctx.fillText(`${SfcRH}%`, 0.25*Canv.width, Canv.height * Scaley/5);
	Scaley += 1;
	
	ctx.font = `bold ${Canv.width/55}px sans-serif`;
	ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.textAlign = "left";
	ctx.fillText(`Low RH:`, 0.02*Canv.width, Canv.height * Scaley/5);
	//ctx.fillStyle = LapseRateColor(MMR);
	ctx.font = `${Canv.width/55}px sans-serif`;
	ctx.textAlign = "right";
	ctx.fillText(`${LowRH}%`, 0.25*Canv.width, Canv.height * Scaley/5);
	Scaley += 1;
	
	ctx.font = `bold ${Canv.width/55}px sans-serif`;
	ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.textAlign = "left";
	ctx.fillText(`Mid RH:`, 0.02*Canv.width, Canv.height * Scaley/5);
	//ctx.fillStyle = LapseRateColor(MMR);
	ctx.font = `${Canv.width/55}px sans-serif`;
	ctx.textAlign = "right";
	ctx.fillText(`${MidRH}%`, 0.25*Canv.width, Canv.height * Scaley/5);
	Scaley += 1;
	
	ctx.font = `bold ${Canv.width/55}px sans-serif`;
	ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.textAlign = "left";
	ctx.fillText(`Mean Mix Ratio:`, 0.02*Canv.width, Canv.height * Scaley/5);
	//ctx.fillStyle = LapseRateColor(MMR);
	ctx.font = `${Canv.width/55}px sans-serif`;
	ctx.textAlign = "right";
	ctx.fillText(`${MMR} g/kg`, 0.25*Canv.width, Canv.height * Scaley/5);
	Scaley += 1;
	
	Scaley = 0.8;
	for (let i = 1;i < 4; i++){
		ctx.fillStyle = "rgba(255,255,255,1)";
		ctx.fillRect((0.01 + 0.25 * i)*Canv.width, 0.05 * Canv.height, 1, 0.9 * Canv.height);
	}
	ctx.font = `bold ${Canv.width/55}px sans-serif`;
	ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.textAlign = "left";
	ctx.fillText(`Freezing Level:`, 0.27*Canv.width, Canv.height * Scaley/5);
	//ctx.fillStyle = LapseRateColor(MMR);
	ctx.font = `${Canv.width/55}px sans-serif`;
	ctx.textAlign = "right";
	ctx.fillText(`${FZL}m`, 0.5*Canv.width, Canv.height * Scaley/5);
	Scaley += 1;
	
	ctx.font = `bold ${Canv.width/55}px sans-serif`;
	ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.textAlign = "left";
	ctx.fillText(`MU MPL:`, 0.27*Canv.width, Canv.height * Scaley/5);
	//ctx.fillStyle = LapseRateColor(MMR);
	ctx.font = `${Canv.width/55}px sans-serif`;
	ctx.textAlign = "right";
	ctx.fillText(`${MUMPL}m`, 0.5*Canv.width, Canv.height * Scaley/5);
	Scaley += 1;
	
	ctx.font = `bold ${Canv.width/55}px sans-serif`;
	ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.textAlign = "left";
	ctx.fillText(`LCL Temp:`, 0.27*Canv.width, Canv.height * Scaley/5);
	//ctx.fillStyle = LapseRateColor(MMR);
	ctx.font = `${Canv.width/55}px sans-serif`;
	ctx.textAlign = "right";
	ctx.fillText(`${LCLTemp}F`, 0.5*Canv.width, Canv.height * Scaley/5);
	Scaley += 1;
	
	ctx.font = `bold ${Canv.width/55}px sans-serif`;
	ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.textAlign = "left";
	ctx.fillText(`3km Theta Diff:`, 0.27*Canv.width, Canv.height * Scaley/5);
	//ctx.fillStyle = LapseRateColor(MMR);
	ctx.font = `${Canv.width/55}px sans-serif`;
	ctx.textAlign = "right";
	ctx.fillText(`${ttadiff}K`, 0.5*Canv.width, Canv.height * Scaley/5);
	Scaley += 1;
	
	ctx.font = `bold ${Canv.width/55}px sans-serif`;
	ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.textAlign = "left";
	ctx.fillText(`DownT:`, 0.27*Canv.width, Canv.height * Scaley/5);
	//ctx.fillStyle = LapseRateColor(MMR);
	ctx.font = `${Canv.width/55}px sans-serif`;
	ctx.textAlign = "right";
	ctx.fillText(`${Math.round(DownT)} F`, 0.5*Canv.width, Canv.height * Scaley/5);
	Scaley += 1;
	
	Scaley = 0.8;
	
	ctx.font = `bold ${Canv.width/55}px sans-serif`;
	ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.textAlign = "left";
	ctx.fillText(`STP (cin):`, 0.52*Canv.width, Canv.height * Scaley/5);
	ctx.fillStyle = GetSTPColor(STPC);
	ctx.font = `${Canv.width/55}px sans-serif`;
	ctx.textAlign = "right";
	ctx.fillText(`${STPC}`, 0.75*Canv.width, Canv.height * Scaley/5);
	Scaley += 1;
	
	ctx.font = `bold ${Canv.width/55}px sans-serif`;
	ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.textAlign = "left";
	ctx.fillText(`STP (fixed):`, 0.52*Canv.width, Canv.height * Scaley/5);
	ctx.fillStyle = GetSTPColor(STPF);
	ctx.font = `${Canv.width/55}px sans-serif`;
	ctx.textAlign = "right";
	ctx.fillText(`${STPF}`, 0.75*Canv.width, Canv.height * Scaley/5);
	Scaley += 1;
	
	ctx.font = `bold ${Canv.width/55}px sans-serif`;
	ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.textAlign = "left";
	ctx.fillText(`EHI 0-1km:`, 0.52*Canv.width, Canv.height * Scaley/5);
	ctx.fillStyle = GetSTPColor(EHI01/1.2);
	ctx.font = `${Canv.width/55}px sans-serif`;
	ctx.textAlign = "right";
	ctx.fillText(`${EHI01}`, 0.75*Canv.width, Canv.height * Scaley/5);
	Scaley += 1;
	
	ctx.fillStyle = "rgba(255,255,255,1)";
	
	ctx.font = `bold ${Canv.width/55}px sans-serif`;
    ctx.textAlign = "left";
	ctx.fillText(`EHI 0-3km:`, 0.52*Canv.width, Canv.height * Scaley/5);
	ctx.fillStyle = GetSTPColor(EHI03/1.2);
	ctx.font = `${Canv.width/55}px sans-serif`;
	ctx.textAlign = "right";
	ctx.fillText(`${EHI03}`, 0.75*Canv.width, Canv.height * Scaley/5);
	Scaley += 1;
	
	ctx.font = `bold ${Canv.width/55}px sans-serif`;
	ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.textAlign = "left";
	ctx.fillText(`SigSvr:`, 0.52*Canv.width, Canv.height * Scaley/5);
	//ctx.fillStyle = LapseRateColor(MMR);
	ctx.font = `${Canv.width/55}px sans-serif`;
	ctx.textAlign = "right";
	ctx.fillText(`${SigSvr}m3/s3`, 0.75*Canv.width, Canv.height * Scaley/5);
	Scaley += 1;
	
	Scaley = 0.8;
	
	ctx.font = `bold ${Canv.width/55}px sans-serif`;
	ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.textAlign = "left";
	ctx.fillText(`Supercell:`, 0.77*Canv.width, Canv.height * Scaley/5);
	ctx.fillStyle = GetSCPColor(SCP);
	ctx.font = `${Canv.width/55}px sans-serif`;
	ctx.textAlign = "right";
	ctx.fillText(`${SCP}`, 0.99*Canv.width, Canv.height * Scaley/5);
	Scaley += 1;
	
	ctx.font = `bold ${Canv.width/55}px sans-serif`;
	ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.textAlign = "left";
	ctx.fillText(`SHIP:`, 0.77*Canv.width, Canv.height * Scaley/5);
	ctx.fillStyle = GetSTPColor(STPF);
	ctx.font = `${Canv.width/55}px sans-serif`;
	ctx.textAlign = "right";
	ctx.fillText(`${SHIP}`, 0.99*Canv.width, Canv.height * Scaley/5);
	Scaley += 1;
	
	ctx.font = `bold ${Canv.width/55}px sans-serif`;
	ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.textAlign = "left";
	ctx.fillText(`WNDG:`, 0.77*Canv.width, Canv.height * Scaley/5);
	ctx.fillStyle = GetSTPColor(WNDG);
	ctx.font = `${Canv.width/55}px sans-serif`;
	ctx.textAlign = "right";
	ctx.fillText(`${WNDG}`, 0.99*Canv.width, Canv.height * Scaley/5);
	Scaley += 1;
	
	ctx.font = `bold ${Canv.width/55}px sans-serif`;
	ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.textAlign = "left";
	ctx.fillText(`Derecho Comp:`, 0.77*Canv.width, Canv.height * Scaley/5);
	ctx.fillStyle = GetSTPColor(DerechoComp /1.75);
	ctx.font = `${Canv.width/55}px sans-serif`;
	ctx.textAlign = "right";
	ctx.fillText(`${DerechoComp}`, 0.99*Canv.width, Canv.height * Scaley/5);
	Scaley += 1;
	
	ctx.font = `bold ${Canv.width/55}px sans-serif`;
	ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.textAlign = "left";
	ctx.fillText(`DCape:`, 0.77*Canv.width, Canv.height * Scaley/5);
	//ctx.fillStyle = LapseRateColor(MMR);
	ctx.font = `${Canv.width/55}px sans-serif`;
	ctx.textAlign = "right";
	ctx.fillText(`${Math.round(DCape)} J/kg`, 0.99*Canv.width, Canv.height * Scaley/5);
	Scaley += 1;
}

function GetDCape(Sound){
	let mine = 1000;
	let minp = -999;
	let dCape = 0;
	
	let StartSlice = GetLayerByPres(Sound, "SFC");
	
	for (let i = StartSlice.P; (StartSlice.P-400) <= i; i-=1){
		let tta = mean_thetae(Sound, i, i-50);
		
		if (tta < mine){
			minp = i-50;
			mine = tta;
		}
	}
	
	let upper = GetLayerByPres(Sound, minp);
	let tp1 = wetbulb(upper.P, upper.T, upper.D);
	
	let ttrace = [tp1];
	let ptrace = [upper.P];
	
	let te1 = upper.T;
	let pe1 = upper.P;
	let h1 = upper.H;
	
	for (let i = upper.P-1; StartSlice.P > i; i++){
		let Sc = GetLayerByPres(Sound, i);
		let tp2 = wetlift(pe1, tp1, i);
		let te2 = Sc.T;
		
		ttrace.push(tp2);
		ptrace.push(i);

		let HPart = Sc.H - h1;
		
		let tdef = (tp1 - te1)/(CtoK(te1));
		let tdef2 = (tp2 - te2)/(CtoK(te2));
		
		let ly = ((tdef + tdef2)/2 * HPart);
		dCape += GRAVITY * ly;
		
		pe1 = i;
		te1 = te2;
		h1 = Sc.H;
		tp1 = tp2;
	}
	
	return {
		DCape: dCape,
		DownT: Math.round(CToF(tp1)),
		TempTrace: ttrace,
		PresTrace: ptrace,
	};
}
  
  
function Clean(){
  var Canv = document.getElementById("hodograph");
  var ctx = Canv.getContext("2d");
  
  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.fillRect(0,0,1000,1000);
  
   Canv = document.getElementById("skewT");
   ctx = Canv.getContext("2d");
  
  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.fillRect(0,0,1000,1000);
  
   Canv = document.getElementById("Values1");
   ctx = Canv.getContext("2d");
  
  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.fillRect(0,0,1000,1000);
  
   Canv = document.getElementById("Values2");
   ctx = Canv.getContext("2d");
  
  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.fillRect(0,0,1000,1000);
  
   Canv = document.getElementById("Values3");
   ctx = Canv.getContext("2d");
  
  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.fillRect(0,0,1000,1000);
  
   Canv = document.getElementById("Values4");
   ctx = Canv.getContext("2d");
  
  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.fillRect(0,0,1000,1000);
  
   Canv = document.getElementById("Values5");
   ctx = Canv.getContext("2d");

  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.fillRect(0,0,1000,1000);
}

let CSMot = {};

function DrawWindParams(Sounding, WindParams){
  const Canv = document.getElementById("Values5");
  const ctx = Canv.getContext("2d");

  Canv.width = 700;
  Canv.height = 400;

  let Scale = 1.2;

  let Scaler = 0.5;

  ctx.fillStyle = "rgba(255,255,255,1)";

  ctx.fillRect(0.05 * Canv.width, 0.125 * Canv.height, 0.9 * Canv.width, 2);
  
  ctx.font = `bold ${Canv.width/30}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`Level`, Canv.width * (0.1 + Scaler/14), Canv.height * 0.1);

  Scaler += 4;

  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.font = `bold ${Canv.width/35}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`Shear (BWD)`, Canv.width * (0.1 + Scaler/14), Canv.height * 0.1);

  Scaler += 3;

  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.font = `bold ${Canv.width/35}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`SRH`, Canv.width * (0.1 + Scaler/14), Canv.height * 0.1);

  Scaler += 3;

  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.font = `bold ${Canv.width/35}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`SRWind`, Canv.width * (0.1 + Scaler/14), Canv.height * 0.1);
  
  let Ps = [
	  ["Sfc-500m",WindParams.BWD005,WindParams.SRH005, "rgba(255,255,255,1)"],
	  ["Sfc-1km",WindParams.BWD01,WindParams.SRH01, "rgba(225,225,255,1)"],
	  ["Eff Inflow",WindParams.BWDE,WindParams.ESRH, "rgba(0,255,255,1)"],
	  ["Sfc-3km",WindParams.BWD03,WindParams.SRH03, "rgba(200,200,255,1)"],
	  ["1km-3km",WindParams.BWD13,WindParams.SRH13, "rgba(175,175,255,1)"],
	  ["3km-6km",WindParams.BWD36,WindParams.SRH36, "rgba(150,150,255,1)"],
	  ["Sfc-6km",WindParams.BWD06,WindParams.SRH06, "rgba(125,125,255,1)"],
  ];
  
  
  Ps.forEach((obj) => {
	  //console.log(obj);
	  Scaler = 0.5;
	  ctx.fillStyle = obj[3];
	  
	  
	  ctx.font = `bold ${Canv.width/25}px sans-serif`;
	  ctx.textAlign = "left";
	  ctx.fillText(`${obj[0]}`, Canv.width * (0.01 + Scaler/14), Canv.height * (0.1 + Scale/Ps.length * 0.8));

	  Scaler += 4;
	  
	  let BWD = Mag(obj[1]);

	  
	  ctx.font = `${Canv.width/30}px sans-serif`;
	  ctx.textAlign = "center";
	  ctx.fillText(`${Math.round(BWD)}kts`, Canv.width * (0.1 + Scaler/14), Canv.height * (0.1 + Scale/Ps.length * 0.8));

	  Scaler += 3;
	  
	  
	  if (obj[0] == "Eff Inflow"){
		  ctx.font = `${Canv.width/30}px sans-serif`;
		  ctx.textAlign = "center";
		  ctx.fillText(`${Math.round(obj[2])}m2/s2`, Canv.width * (0.1 + Scaler/14), Canv.height * (0.1 + Scale/Ps.length * 0.8));
	  } else {
	
		  ctx.font = `${Canv.width/30}px sans-serif`;
		  ctx.textAlign = "center";
		  ctx.fillText(`${Math.round(obj[2].SRHP + obj[2].SRHM)}m2/s2`, Canv.width * (0.1 + Scaler/14), Canv.height * (0.1 + Scale/Ps.length * 0.8));
	  }

	  

	  Scaler += 3;
	  
	  let SRWind = {
		  x: obj[1].x - CSMot.x,
		  y: obj[1].y - CSMot.y,
	  }
	  
	  SRWind = Math.round(Mag(SRWind));

	
	  ctx.font = `${Canv.width/30}px sans-serif`;
	  ctx.textAlign = "center";
	  ctx.fillText(`${SRWind}kts`, Canv.width * (0.1 + Scaler/14), Canv.height * (0.1 + Scale/Ps.length * 0.8));
	  
	  Scale += 1;
  })
};

function GetBoxPos(BoundX, BoundY, X, Y){
	return{x:BoundX[0] + (BoundX[1]-BoundX[0])*(X/100),y:BoundY[0] + (BoundY[1]-BoundY[0])*(Y/100)};
}

function relh(p, t, td){
	return 100 * VaporPressure(td)/VaporPressure(t);
}

function mean_relh(Sounding, pbot, ptop){
	let RH = 0;
	let Cout = 0;
	
	for (let i = pbot; ptop < i; i--){
		let Slice = GetLayerByPres(Sounding, i);
		let rh = relh(i, Slice.T, Slice.D);
		
		RH += (rh*i);
		Cout+=i;
	}
	
	return (RH/Cout);
}

function RtoDeg(radians) {
    return radians * (180 / Math.PI);
}

function DrawBoxes(Sounding, Info){
	const Canv = document.getElementById("Values4");
  const ctx = Canv.getContext("2d");
  let SSlice = GetLayerByHght(Sounding.Sounding,"SFC");
  
  Canv.width = 800;//Canv.style.width;
  Canv.height = 800;
  
  let PosX = 0;
  let PosY = 0;
  
  let BoundsX = [0,400];
  let BoundsY = [0,400];
  
  ctx.strokeStyle = "rgba(255,255,255,1)";
  ctx.lineWidth = 3;
  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.fillRect(0,0,400,400);
  ctx.strokeRect(0, 0, 400, 400);
  
  ctx.strokeRect(0, 400, 400, 400);
  ctx.strokeRect(400, 400, 400, 400);
  
  let Sound = Sounding.Sounding;
  
  //First Box, SR Wind
  ctx.beginPath();
  ctx.lineWidth = 5;
  ctx.setLineDash([5,5]);
  ctx.strokeStyle = "rgba(255,0,0,1)";
  ctx.fillStyle = "rgba(255,0,0,0.1)";
  ctx.lineTo(0,400);
  
  let pl = 0;
  
  for (let i = 0; i < Sound.W.length; i++){
	  let Slice = Sound.W[i];
	  
	  if (Slice.H > 16000){
		  break;
	  }
	
	  let Wind = ConvertPolartoCart(Slice);
	  Wind.x -= CSMot.x;
	  Wind.y += CSMot.y;
	  let Wnd = Math.round(Mag(Wind));

	  let Pos = GetBoxPos(BoundsX, BoundsY, 100 * (Wnd/80), 100 * (1-Slice.H/16000));
	  ctx.lineTo(Pos.x, Pos.y);
	  pl = Pos.y;
	  //ctx.moveTo(Pos.x,Pos.y);
  }
  
  ctx.lineTo(0,pl);
  
  ctx.stroke();
  ctx.fill();
  
  
  ctx.font = `${400 * 0.075}px sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.textAlign = "center";
  let Pos = GetBoxPos(BoundsX, BoundsY, 50, 25);
  ctx.fillText(`SR Wind\n v\n Height`, Pos.x, Pos.y);
  
  
  for (let i = 2; i < 16; i+=2){
	  let Pos = GetBoxPos(BoundsX, BoundsY, 0, 100 * (1 - (i/16)));
	  let Pos2 = GetBoxPos(BoundsX, BoundsY, 100, 100 * (1 - (i/16)));
	  ctx.fillRect(Pos.x, Pos.y, 15, 4);
	  ctx.fillRect(Pos2.x-20, Pos.y, 15, 4);
	  
	  ctx.font = `${400 * 0.06}px sans-serif`;
	  ctx.fillText(`${i}`, Pos.x+30, Pos.y+5);
  }
  
  for (let i = 10; i <= 70; i+=10){
	  let Pos = GetBoxPos(BoundsX, BoundsY, 100 * ((i/80)), 0);
	  let Pos2 = GetBoxPos(BoundsX, BoundsY, 100 * ((i/80)), 100);
	  
	  ctx.fillRect(Pos.x, Pos.y, 4, 15);
	  ctx.fillRect(Pos.x, Pos2.y- 20, 4, 15);
  }
  
  //Next Box, Mean Mix ratio
  BoundsX = [400,800];
  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.fillRect(400,0,400,400);
  ctx.strokeStyle = "rgba(255,255,255,1)";
  ctx.setLineDash([]);
  ctx.lineWidth = 3;
  ctx.strokeRect(400, 0, 400, 400);
  
  let EFFRH = "--";
  if (Info.EffInflow == false){
	  EFFRH = "--";
  } else {
	  EFFRH = mean_relh(Sound, Info.EffInflow.Bot, Info.EffInflow.Top);
  }
  
  
  ctx.font = `${400 * 0.08}px sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.textAlign = "center";
  Pos = GetBoxPos(BoundsX, BoundsY, 50, 20);

  ctx.fillText(`Mix Ratio (g/kg)`, Pos.x, Pos.y);
  ctx.font = `${400 * 0.07}px sans-serif`;
  ctx.fillText(`Eff RH: ${Math.round(EFFRH)}%`, Pos.x, Pos.y+35);
  
  for (let i = 0.5; i < 3; i+=0.5){
	  let Pos = GetBoxPos(BoundsX, BoundsY, 0, 100 * (1 - (i/3)));
	  let Pos2 = GetBoxPos(BoundsX, BoundsY, 100, 100 * (1 - (i/3)));
	  ctx.fillRect(Pos.x, Pos.y, 15, 4);
	  ctx.fillRect(Pos2.x-20, Pos.y, 15, 4);
	  
	  ctx.font = `${400 * 0.06}px sans-serif`;
	  ctx.fillText(`${i}`, Pos.x+30, Pos.y+5);
  }
  
  for (let i = 5; i < 25; i+=5){
	  let Pos = GetBoxPos(BoundsX, BoundsY, 100 * ((i/25)), 0);
	  let Pos2 = GetBoxPos(BoundsX, BoundsY, 100 * ((i/25)), 100);
	  
	  ctx.fillRect(Pos.x, Pos.y, 4, 15);
	  ctx.fillRect(Pos.x, Pos2.y- 20, 4, 15);
	  
	  //ctx.textAlign = "left";
	  ctx.font = `${400 * 0.06}px sans-serif`;
	  ctx.fillText(`${i}`, Pos.x, Pos2.y-25);
  }
  
  ctx.beginPath();
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(0,255,0,0.7)";
  ctx.fillStyle = "rgba(0,255,0,0.1)";
  ctx.lineTo(400, 400);
  
  for (let i = 0; i < Sound.DW.length; i++){
	  let Slice = Sound.DW[i];
	  
	  if (Slice.H > 3000){
		  break;
	  }
	
	  let MMR = mixratio(Slice.P, Slice.D);
	  let Pos = GetBoxPos(BoundsX, BoundsY, 100 * (MMR/25), 100 * (1-Slice.H/3000));
	  ctx.lineTo(Pos.x, Pos.y);
	  //ctx.moveTo(Pos.x,Pos.y);
  }
  ctx.lineTo(400, 0);
  ctx.fill();
  ctx.stroke();
  
  //Theta now
  BoundsX = [0,400];
  BoundsY = [400,800];
  
  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.fillRect(0,400,400,400);
  ctx.strokeStyle = "rgba(255,255,255,1)";
  ctx.setLineDash([]);
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 400, 400, 400);
  ctx.font = `${400 * 0.08}px sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.textAlign = "center";
  
  
  
  for (let i = 500; i < 1000; i+=100){
	  let Pos = GetBoxPos(BoundsX, BoundsY, 0, 100 * ((i-400)/600));
	  let Pos2 = GetBoxPos(BoundsX, BoundsY, 100, 100 * ((i-400)/600));
	  ctx.fillRect(Pos.x, Pos.y, 15, 4);
	  ctx.fillRect(Pos2.x-20, Pos.y, 15, 4);
	  
	  ctx.font = `${400 * 0.07}px sans-serif`;
	  ctx.fillText(`${i}`, Pos.x+35, Pos.y+5);
  }
  
  let MinTta = 999;
  let MaxTta = 0;
  let Tta = [];
  let TtaPres = [];
  
  
  for (let i = 0; i < Sound.DW.length; i++){
	  let obj = ConvertToInfo(Sound.Slice[i]);
	  
	  if (obj.P < 500){
		  break;
	  }
	  
	  let TTa = CtoK(thetae(obj.P, obj.T, obj.D)) || -9999;
	  
	  if (TTa != TTa || TTa == -9999){
		  continue;
	  }
	  
	  Tta.push(TTa);
	  TtaPres.push(obj.P);
	  
	  MinTta = Math.min(MinTta, TTa-10);
	  MaxTta = Math.max(MaxTta, TTa+10);
  }
  
  
  
  ctx.beginPath();
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(255,0,0,0.7)";
  ctx.fillStyle = "rgba(255, 0, 0, 0.1)";
  let PosL = 50;

  
  for (let i = 0; i < Tta.length; i++){
	  let P = TtaPres[i];
	  let T = Tta[i];
	  let Lerped = (T - MinTta)/(MaxTta - MinTta);
	  let Lerpd = ((P-400)/600);
	  
	  let Pos = GetBoxPos(BoundsX, BoundsY, 100 * Lerped, 100 * Lerpd);
	  
	  if (i == 0){
		  ctx.lineTo(0, Pos.y);
	  }
	  
	  ctx.lineTo(Pos.x, Pos.y);
	  PosL = Pos.y;
	  //ctx.moveTo(Pos.x,Pos.y);
  }
  ctx.lineTo(0, PosL);
  ctx.fill();
  ctx.stroke();
   ctx.fillStyle = "rgba(255, 255, 255, 1)";
  
  for (let i = 320; i < 400; i+=10){
	  let Lerped = (i - MinTta)/(MaxTta - MinTta);
	  let Pos = GetBoxPos(BoundsX, BoundsY, 100 * Lerped, 0);
	  let Pos2 = GetBoxPos(BoundsX, BoundsY, 100 * Lerped, 100);
	  
	  ctx.fillRect(Pos.x, Pos.y, 4, 15);
	  ctx.fillRect(Pos.x, Pos2.y- 20, 4, 15);
	  
	  //ctx.textAlign = "left";
	  ctx.font = `${400 * 0.07}px sans-serif`;
	  ctx.fillText(`${i}`, Pos.x, Pos2.y-25);
  }
  
  ctx.font = `${400 * 0.08}px sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.textAlign = "center";
  Pos = GetBoxPos(BoundsX, BoundsY, 50, 20);

  ctx.fillText(`Theta E v Pres`, Pos.x, Pos.y);
  
  //Last Box
  BoundsX = [400,800];
  
  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.fillRect(400,400,400,400);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,1)";
  ctx.strokeRect(400, 400, 400, 400);
  
  ctx.font = `${400 * 0.1}px sans-serif`;
  ctx.fillStyle = "rgba(255,0,0,0.1)";
  ctx.textAlign = "center";
  
  let Nn = [
	[400, 800]
  ];
  
  ctx.beginPath();
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(255,0,0,0.7)";
  //ctx.moveTo(400,800);
  ctx.lineTo(400, 800);
  
  for (let i = 0; i < Sound.W.length; i++){
	  let P = ConvertPolartoCart(Sound.W[i]);
	  P.H = Sound.W[i].H;
	  let N = ConvertPolartoCart(Sound.W[i+1]);
	  
	  if (P.H > 3000){
		  break;
	  }
	  
	  let R = {
		  x: P.x - N.x,
		  y: P.y + N.y,
	  };
	  
	  let B = {
		  x: -P.x + CSMot.x,
		  y: -P.y + CSMot.y,
	  };
	  
	  let AngToNext = RtoDeg(Math.atan(R.y/R.x));
	  let AngToBM = RtoDeg(Math.atan(B.y/B.x));
	  

	  
	  let V = ((AngToNext+90) - AngToBM)%360;
	  
	  let Lerped = clamp(1 - Math.abs(V-180)/180,0,1);
	  
	  let Pos = GetBoxPos(BoundsX, BoundsY, 100 * Lerped, 100 * (1 - P.H/3000));

	  ctx.lineTo(Pos.x, Pos.y);
	  //ctx.moveTo(Pos.x,Pos.y);
  }
  
  ctx.lineTo(400, 400);
  ctx.stroke();
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,1)";
  ctx.strokeRect(400, 400, 400, 400);
  
  ctx.fillStyle = "rgba(255, 255, 255 ,1)";
  
  for (let i = 0.5; i < 3; i+=0.5){
	  let Pos = GetBoxPos(BoundsX, BoundsY, 0, 100 * (1 - (i/3)));
	  let Pos2 = GetBoxPos(BoundsX, BoundsY, 100, 100 * (1 - (i/3)));
	  ctx.fillRect(Pos.x, Pos.y, 15, 4);
	  ctx.fillRect(Pos2.x-20, Pos.y, 15, 4);
	  
	  ctx.font = `${400 * 0.06}px sans-serif`;
	  ctx.fillText(`${i}`, Pos.x+30, Pos.y+5);
  }
  
  for (let i = 20; i < 100; i+=20){
	  let Pos = GetBoxPos(BoundsX, BoundsY, 100 * ((i/100)), 0);
	  let Pos2 = GetBoxPos(BoundsX, BoundsY, 100 * ((i/100)), 100);
	  
	  ctx.fillRect(Pos.x, Pos.y, 4, 15);
	  ctx.fillRect(Pos.x, Pos2.y- 20, 4, 15);
	  
	  //ctx.textAlign = "left";
	  ctx.font = `${400 * 0.06}px sans-serif`;
	  ctx.fillText(`${Math.round(i)}%`, Pos.x, Pos2.y-25);
  }
  
  ctx.font = `${400 * 0.1}px sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.textAlign = "center";
  Pos = GetBoxPos(BoundsX, BoundsY, 50, 20);

  ctx.fillText(`SW% ωₛ`, Pos.x, Pos.y);
}

function LoadWithParcel(Sounding, DisplayParcel, Info){
  const Canv = document.getElementById("skewT");
  const ctx = Canv.getContext("2d");

  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.fillRect(0,0,1000,1000);  
  
  let Sound = Sounding.Sounding;
  
  let StartSlice = GetLayerByPres(Sound, "SFC");
  let EndSlice = GetLayerByPres(Sound, "Last");
  
  for (th=-30; th<230; th+=10){ 
    dry_adiabat(th)
  };
  
  for (let i = -110; i <= 80; i+=10){
    ctx.save();
    
    ctx.translate(GetSkewRatio(i) * Canv.width, 0);
    /*for (let x = 0; x < 99; x++){
      ctx.beginPath();
      ctx.moveTo(-Canv.width*0.5*(x/100), (x/100)*Canv.height);
      ctx.lineTo(-Canv.width*0.5*((x+1)/100), ((x+1)/100)*Canv.height);
      ctx.stroke();
    }*/

    if (i == -20 || i == 0){
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(125,125,255,0.35)";
    } else {
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
    }
    
    ctx.beginPath();
	ctx.setLineDash([8,3]);
    ctx.moveTo(Canv.width*0.5, 0);
    ctx.lineTo(0, Canv.height);
    ctx.stroke();

    ctx.restore();
  }


  //Lines
  
  ctx.beginPath();
  ctx.setLineDash([5,5]);
  ctx.lineWidth = 2;

  ctx.strokeStyle = "rgba(255,255,255,1)";
  
  for (let i = 0; i < DisplayParcel.Path.length-1; i++){
    let N = DisplayParcel.Path[i];
    let PX = LevelToSkewNum(DisplayParcel.Start.P-i, DisplayParcel.Start.P);
    let PY = PressuretoSkew(DisplayParcel.Start.P-i, DisplayParcel.Start.P);
    let R = GetSkewRatio(N);

    let N2 = DisplayParcel.Path[i+1];
    let PX2 = LevelToSkewNum(DisplayParcel.Start.P-(i+1), DisplayParcel.Start.P);
    let PY2 = PressuretoSkew(DisplayParcel.Start.P-(i+1), DisplayParcel.Start.P);
    let R2 = GetSkewRatio(N2);

    
    ctx.moveTo((R + PX) * Canv.width, PY * Canv.height);
    ctx.lineTo((R2 + PX2) * Canv.width, PY2 * Canv.height);
    //ctx.moveTo(Center.x/2 + Pos2.x, Center.y + Pos2.y)
  }
  
  ctx.stroke();
  ctx.fillStyle = "rgba(255,0,0,0.5)";
  
  ctx.fillRect(0, pres_to_pix(DisplayParcel.Start.P), Canv.width,2);
  
  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.setLineDash([2,2]);
  ctx.strokeStyle = "rgba(200,0,125,1)";
  
  DrawValuesKey();
  DrawValues("SB", Info.SBParcel, Info.SBParcel == DisplayParcel);
  DrawValues("ML", Info.MLParcel, Info.MLParcel == DisplayParcel);
  DrawValues("MU", Info.MUParcel, Info.MUParcel == DisplayParcel);
  DrawValues("CU", CUPrcl, CUPrcl == DisplayParcel);
  
 // console.log(DCapeProf.PresTrace);
  let DCapeProf = Info.DCapeProf;
  
  for (let i = 0; i < DCapeProf.PresTrace.length; i++){
    let N = DCapeProf.TempTrace[i];
	let PX = pres_to_pix(DCapeProf.PresTrace[i]);
	let PY = temp_to_pix(N, DCapeProf.PresTrace[i]);
    //let PX = LevelToSkewNum(DCapeProf.PresTrace[i], DCapeProf.PresTrace[0]);
    //let PY = PressuretoSkew(DCapeProf.PresTrace[i], DCapeProf.PresTrace[0]);
    //let R = GetSkewRatio(N);

    let N2 = DCapeProf.TempTrace[i+1];
    //let PX2 = LevelToSkewNum(DCapeProf.PresTrace[i+1], DCapeProf.PresTrace[0]);
   // let PY2 = PressuretoSkew(DCapeProf.PresTrace[i+1], DCapeProf.PresTrace[0]);
    //let R2 = GetSkewRatio(N2);
	let PX2 = pres_to_pix(DCapeProf.PresTrace[i+1]);
	let PY2 = temp_to_pix(N2, DCapeProf.PresTrace[i+1]);
    ctx.moveTo(PY, PX);
	ctx.lineTo(PY2, PX2);
    //ctx.lineTo((R2 + PX2) * Canv.width, PY2 * Canv.height);
    //ctx.moveTo(Center.x/2 + Pos2.x, Center.y + Pos2.y)
  }

  ctx.stroke();

  ctx.setLineDash([]);
  
  ctx.save();
  ctx.restore();
  ctx.font = `bold ${Canv.width/75}px sans-serif`;
  for (w of [5, 10, 15, 20, 25]) {
    MixRatioLine(w);
  }
  
   ctx.fillStyle = "rgba(255,255,255,1)";
   ctx.fillText(`Omega`, 0.05*Canv.width,  15);
  
  [0, 1,3,6,9,12,15].forEach((object) => {
	  if (EndSlice.H/1000 < object){
		  return;
	  }
    let GetPresLayer = GetLayerByHght(Sound, object*1000);
    
    if (GetPresLayer != null){
      let Loc = pres_to_pix(GetPresLayer.P, Sound.DW[0].P);

      ctx.font = `bold ${Canv.width/55}px sans-serif`;

      ctx.fillStyle = "rgba(255,10,10,1)";
      ctx.textAlign = "center";

      if (object == 0){
        ctx.fillText(`SFC`, 0.15*Canv.width,  Loc);
        ctx.fillRect(0.1*Canv.width,  (Loc - 1), 0.02*Canv.width, 2);
      } else {
        ctx.fillText(`${object}km`, 0.15*Canv.width,  Loc);
        ctx.fillRect(0.1*Canv.width, (Loc - 1), 0.02*Canv.width, 2);
      }
      
    }
   
  });

  ctx.font = `bold ${Canv.width/65}px sans-serif`;
  [1000, 925, 850, 700, 500, 300, 200, 100].forEach((object) => {
    let Line = pres_to_pix(object);

    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.textAlign = "left";
    ctx.fillText(`${object}mb`, 0.005*Canv.width, (-2 + Line));
    ctx.fillStyle = `rgba(255,255,255,0.7)`;
    ctx.fillRect(0, (-2 + Line), Canv.width, 1);
  })
  for (let i = 1000; 100 <= i; i-=100){
    let Line = pres_to_pix(i);

    ctx.fillStyle = `rgba(255,255,255,0.1)`;
    ctx.fillRect(0, (-2 + Line), Canv.width, 1);
  }

  DrawLine(Sounding, "Dew");
  DrawLine(Sounding, "WetBulb");
  DrawLine(Sounding, "VTemp");
  DrawLine(Sounding, "Temp");
  
  let sp = pres_to_pix(StartSlice.P);
  let ep = pres_to_pix(EndSlice.P);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillRect(0.065 * Canv.width, sp, 3, (ep-sp));
  
  if (Sound.OMEGA.length > 0){
	  for (let i = 0; i < Sound.OMEGA.length; i++){
		  let Pres = Sound.P[i];
		  let Omg = Sound.OMEGA[i];
		  let Center = 0.065;
		  
		  if (Omg > 0){
			  ctx.fillStyle = "rgba(255,0,0,0.8)";
		  } else {
			  ctx.fillStyle = "rgba(125,125,255,0.8)";
		  }
		  let pp = pres_to_pix(Pres);
		  ctx.fillRect(Center * Canv.width, pp, Omg * Canv.width, 5);
	  }
  }

  DrawInflow(Sounding.Sounding, Info.EffInflow);

  ctx.font = `bold ${Canv.width/40}px sans-serif`;
  
  
  ctx.fillStyle = `rgba(0,200,200,1)`;
  let ddx = (GetSkewRatio(StartSlice.WB) + LevelToSkewNum(StartSlice.P))*Canv.width;
  let ddy = pres_to_pix(StartSlice.P) + 0.025 * Canv.height;
  ctx.fillText(`${Math.round(CToF(StartSlice.WB))}`, ddx, ddy);
  
  ctx.fillStyle = `rgba(255,0,0,1)`;
  ctx.textAlign= "left";
  ddx = (GetSkewRatio(StartSlice.T) + LevelToSkewNum(StartSlice.P))*Canv.width;
  ddy = pres_to_pix(StartSlice.P) + 0.025 * Canv.height;
  ctx.fillText(`${Math.round(CToF(StartSlice.T))}`, ddx, ddy);




ctx.textAlign= "right";
  ctx.fillStyle = `rgba(0,255,0,1)`;
  ddx = (GetSkewRatio(StartSlice.D) + LevelToSkewNum(StartSlice.P))*Canv.width;
  ddy = pres_to_pix(StartSlice.P) + 0.025 * Canv.height;
  ctx.fillText(`${Math.round(CToF(StartSlice.D))}`, ddx, ddy);
  
  

  //LFC, LCL, EL
  let LCL = false;let LFC = false;let EL = false;let MPL = false;
  
  try {
  if (DisplayParcel.LCL == -9999){
	  LCL = false;
  } else {
	  LCL = GetLayerByHght(Sound, DisplayParcel.Start.H + DisplayParcel.LCL);
  }
  if (DisplayParcel.LFC == -9999){
	  LFC = false;
  } else {
	  LFC = GetLayerByHght(Sound, DisplayParcel.Start.H + DisplayParcel.LFC);
  }
  if (DisplayParcel.EL == -9999){
	  EL = false;
  } else {
	  EL = GetLayerByHght(Sound, DisplayParcel.EL);
  }
  if (DisplayParcel.MPL == -9999){
	  MPL = false;
  } else {
	  MPL = GetLayerByHght(Sound, DisplayParcel.MPL);
  }
  }catch(E){
	  
  }
  
  let FZL = GetLayerByTemp(Sound, 0);
  
  let T10 = GetLayerByTemp(Sound, -10);
  let T20 = GetLayerByTemp(Sound, -20);
  let T30 = GetLayerByTemp(Sound, -30);

 // console.log(EL);

ctx.textAlign = "center";
  
  ctx.font = `bold ${Canv.width/60}px sans-serif`;
  
  ctx.fillStyle = `rgba(200,200,200,1)`;
  ddy = pres_to_pix(T10.P);// --+ 0.02 * Canv.height;
  ctx.fillText(`<- ${Math.round(DisplayParcel.PreHGZCape)}`, 0.75 * Canv.width, ddy - 0.005 * Canv.height);
  ddy = (pres_to_pix(T30.P) + pres_to_pix(T10.P))/2;// --+ 0.02 * Canv.height;
  ctx.font = `bold ${Canv.width/50}px sans-serif`;
  ctx.fillText(`<- ${Math.round(DisplayParcel.HGZCape)} HGZCape`, 0.725 * Canv.width, ddy - 0.005 * Canv.height);
  ctx.font = `bold ${Canv.width/60}px sans-serif`;
  
  ddy = pres_to_pix(T30.P);// --+ 0.02 * Canv.height;
  ctx.fillText(`<- ${Math.round(DisplayParcel.HGZCape + DisplayParcel.PreHGZCape)}`, 0.75 * Canv.width, ddy - 0.005 * Canv.height);
  
  
  
  ctx.font = `bold ${Canv.width/45}px sans-serif`;
  ctx.fillStyle = `rgba(200,0,200,1)`;
  ddy = pres_to_pix(T10.P);// --+ 0.02 * Canv.height;
  ctx.fillRect(0.84 * Canv.width,ddy,0.05 * Canv.width, 1 + 0.002 * Canv.height);
  ctx.fillText(`-10`, 0.86 * Canv.width, ddy - 0.005 * Canv.height);
  

  ddy = pres_to_pix(T20.P);// --+ 0.02 * Canv.height;
  ctx.fillRect(0.84 * Canv.width,ddy,0.05 * Canv.width, 1 + 0.002 * Canv.height);
  ctx.fillText(`-20`, 0.86 * Canv.width, ddy - 0.005 * Canv.height);

  ddy = pres_to_pix(T30.P);// --+ 0.02 * Canv.height;
  ctx.fillRect(0.84 * Canv.width,ddy,0.05 * Canv.width, 1 + 0.002 * Canv.height);
  ctx.fillText(`-30`, 0.86 * Canv.width, ddy - 0.005 * Canv.height);
  
  
  ctx.fillStyle = `rgba(0,100,200,1)`;
  ddy = pres_to_pix(FZL.P);// --+ 0.02 * Canv.height;
  ctx.fillRect(0.83 * Canv.width,ddy,0.05 * Canv.width, 1 + 0.002 * Canv.height);
  ctx.fillText(`FZL ${Math.round(FZL.H)}m`, 0.86 * Canv.width, ddy - 0.005 * Canv.height);
  
  
if(LCL != false){
  ctx.fillStyle = `rgba(0,200,0,1)`;
  ddy = pres_to_pix(LCL.P);// --+ 0.02 * Canv.height;
  ctx.fillRect(0.92 * Canv.width,ddy,0.06 * Canv.width, 1 + 0.002 * Canv.height);
  ctx.fillText(`LCL`, 0.95 * Canv.width, ddy + 0.02 * Canv.height);
}
if(LFC != false){
  ctx.fillStyle = `rgba(200,200,0,1)`;
  ddy = pres_to_pix(LFC.P) ;//+ 0.02 * Canv.height;
  ctx.fillRect(0.93 * Canv.width,ddy,0.04 * Canv.width, 1 + 0.002 * Canv.height);
  ctx.fillText(`LFC`, 0.95 * Canv.width, ddy - 0.005 * Canv.height);
}

  if(EL != false){
  ctx.fillStyle = `rgba(200,0,200,1)`;
  ddy = pres_to_pix(EL.P) ;//+ 0.02 * Canv.height;
  ctx.fillRect(0.93 * Canv.width,ddy,0.04 * Canv.width, 1 + 0.002 * Canv.height);
  ctx.fillText(`EL`, 0.95 * Canv.width, ddy - 0.005 * Canv.height);
  }
  if(MPL != false){
  ctx.fillStyle = `rgba(255,0,255,1)`;
  ddy = pres_to_pix(MPL.P) ;//+ 0.02 * Canv.height;
  ctx.fillRect(0.93 * Canv.width,ddy,0.04 * Canv.width, 1 + 0.002 * Canv.height);
  ctx.fillText(`MPL`, 0.95 * Canv.width, ddy - 0.005 * Canv.height);
  }
}

function LoadWithWind(Sounding, Info){
  let Sound = Sounding.Sounding;
  
  DrawHodograph(Sounding);
  
  let ESRH = 0;
  if (Info.EffInflow != false){
	  ESRH = GetSRH(Sound, Info.EffInflow.Bot, Info.EffInflow.Top, "Pres");
	  ESRH = ESRH.SRHP + ESRH.SRHM;
  }

  let hght0km = GetLayerByHght(Sound, "SFC");
  let hght6km = GetLayerByHght(Sound, 6000);

  WindParams = {
	  ESRH : ESRH,
	  SRH03 : GetSRH(Sound, 0, 3000, "Hght"),
	  SRH01 : GetSRH(Sound, 0, 1000, "Hght"),
	  SRH005 : GetSRH(Sound, 0, 500, "Hght"),
	  SRH13 : GetSRH(Sound, 1000, 3000, "Hght"),
	  SRH36 : GetSRH(Sound, 3000, 6000, "Hght"),
	  SRH06 : GetSRH(Sound, 0, 6000, "Hght"),
	  BWD005 : WindShearFind(Sound, 0, 500),
	  BWD01 : WindShearFind(Sound, 0, 1000),
	  BWD03 : WindShearFind(Sound, 0, 3000),
	  BWD13 : WindShearFind(Sound, 1000, 3000),
	  BWD36 : WindShearFind(Sound, 3000, 6000),
	  BWDE : false,
	  BWD06 : WindShearFind(Sound, 0, 6000),
	  BRM : CSMot,
	  EBWD : 0,
  };
  
  if (Info.EffInflow != false){
	 WindParams.BWDE = WindShearFindP(Sound, Info.EffInflow.Bot, Info.EffInflow.Top)
  }
  
  let EBWD = WindShear(ConvertPolartoCart(hght0km), ConvertPolartoCart(hght6km))
  WindParams.EBWD = Math.sqrt(Math.pow(EBWD.x,2)+Math.pow(EBWD.y,2));
  
  DrawWindParams(Sounding, WindParams);
  DrawBoxes(Sounding, Info);
  
  let TPerms = {
	  DCapeProf: Info.DCapeProf,
  };
  
  DrawInsetParams(Sounding, WindParams, TPerms, Info.SBParcel, Info.MLParcel, Info.MUParcel);
  
  //let SRH03 = GetSRH(Sound, 0, 3000, "Hght");
  //console.log(SRH);

  DrawInflowHodo(Sound, Info.EffInflow);
}

let Info = {};
let Snding = {};
let DP = {};
let CUPrcl = [];
let Motions = {};
let CUMot = {};
let rStart = {};
let WindParams = {};
let relStart = false;
	
function DrawSkewT(Sounding, resetStart=false, modify=false){
  const Canv = document.getElementById("skewT");
  const ctx = Canv.getContext("2d");

  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.fillRect(0,0,1000,1000);

  Canv.width = 800;//Canv.style.width;
  Canv.height = 800;
  
  DrawSkewNumbers();
  DrawBarbs(Sounding);

 

  ctx.lineWidth = 1;

  let SBParcel = LiftParcel(Sounding.Sounding, "SB");
  let MLParcel = LiftParcel(Sounding.Sounding, "ML");
  let MUParcel = LiftParcel(Sounding.Sounding, "MU", 767);
  let CUParcel = LiftParcel(Sounding.Sounding, "CU", 900);
  let SMS = GetBM(Sounding.Sounding);
  
  CUPrcl = CUParcel;
  DP = MUParcel;
  Motions = SMS;
  Motions.RM.y *= -1;
  Motions.LM.y *= -1;
  CUMot = {
	  x: 0,
	  y: -10,
  };
  CSMot = SMS.RM;


  /*DrawValuesKey();
  DrawValues("SB", SBParcel);
  DrawValues("ML", MLParcel);
  DrawValues("MU", MUParcel, true);*/
  
  let DCapeProf = GetDCape(Sounding.Sounding);
  
  GetLapseBox(Sounding.Sounding);
  
  
  
  let Sound = Sounding.Sounding;
  
  
   let StartSlice = GetLayerByPres(Sound, "SFC");
   
   
   rStart = StartSlice;
   
   if (resetStart == true || relStart == false){
	   console.log("Rest");
	   relStart = JSON.parse(JSON.stringify(StartSlice));
   }
   
   
   
  let EndSlice = GetLayerByPres(Sound, "Last");
  let EffInflow = false;
  if (SBParcel.Path == false){
	let EffInflow = false;
  } else {
	 EffInflow = EffInflowCalc(Sounding.Sounding, StartSlice);
  }
  
  let ESRH = 0;
  if (EffInflow != false){
	  ESRH = GetSRH(Sound, EffInflow.Bot, EffInflow.Top, "Pres");
	  ESRH = ESRH.SRHP + ESRH.SRHM;
  }
  let hght0km = GetLayerByHght(Sound, "SFC");
  let hght6km = GetLayerByHght(Sound, 6000);

  WindParams = {
	  ESRH : ESRH,
	  SRH03 : GetSRH(Sound, 0, 3000, "Hght"),
	  SRH01 : GetSRH(Sound, 0, 1000, "Hght"),
	  SRH005 : GetSRH(Sound, 0, 500, "Hght"),
	  SRH13 : GetSRH(Sound, 1000, 3000, "Hght"),
	  SRH36 : GetSRH(Sound, 3000, 6000, "Hght"),
	  SRH06 : GetSRH(Sound, 0, 6000, "Hght"),
	  BWD005 : WindShearFind(Sound, 0, 500),
	  BWD01 : WindShearFind(Sound, 0, 1000),
	  BWD03 : WindShearFind(Sound, 0, 3000),
	  BWD13 : WindShearFind(Sound, 1000, 3000),
	  BWD36 : WindShearFind(Sound, 3000, 6000),
	  BWDE : false,
	  BWD06 : WindShearFind(Sound, 0, 6000),
	  BRM : SMS,
	  EBWD : 0,
  };
  
  if (EffInflow != false){
	 WindParams.BWDE = WindShearFindP(Sound, EffInflow.Bot, EffInflow.Top)
  }
  
  let EBWD = WindShear(ConvertPolartoCart(hght0km), ConvertPolartoCart(hght6km))
  WindParams.EBWD = Math.sqrt(Math.pow(EBWD.x,2)+Math.pow(EBWD.y,2));
  
  /*DrawWindParams(Sounding, WindParams);
  DrawBoxes(Sounding, {SMS, EffInflow});
  
  let TPerms = {
	  DCapeProf: DCapeProf,
  };
  
  DrawInsetParams(Sounding, WindParams, TPerms, SBParcel, MLParcel, MUParcel);
  
  //let SRH03 = GetSRH(Sound, 0, 3000, "Hght");
  //console.log(SRH);

  DrawInflowHodo(Sounding.Sounding, EffInflow, GetBM(Sounding.Sounding).RM);*/

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.fillStyle = "rgba(255,0,0,1)";
  
  Info = {DCapeProf, EffInflow, SBParcel, MLParcel, MUParcel};
  Snding = Sounding;
  
  
  
  LoadWithWind(Sounding, Info);
  
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.fillStyle = "rgba(255,0,0,1)";
  
  LoadWithParcel(Sounding, MUParcel, Info);
  
  if (modify){
	  ctx.fillStyle = "rgba(255,0,0,1)";
	  ctx.fillText("Custom Surface Data Loaded", 0.5  *Canv.width, 0.027*Canv.height);
	   console.log("Modified");
   }
}

function LoadNewWind(N){
	let RM = document.getElementById("MotionRM");
	let LM = document.getElementById("MotionLM");
	let CM = document.getElementById("MotionCM");
	
	let Ang = document.getElementById("MotionInputdir").value;
	let Spd = document.getElementById("MotionInputspd").value;
	
	if (N == "RM"){
		RM.innerHTML = "Currently Loaded: Right Motion";
		LM.innerHTML = "Load Left Motion";
		CM.innerHTML = "Load Custom Motion";
		
		CSMot = Motions.RM;
		
		LoadWithWind(Snding, Info);
	} else if (N == "LM"){
		RM.innerHTML = "Load Right Motion";
		LM.innerHTML = "Currently Loaded: Left Motion";
		CM.innerHTML = "Load Custom Motion";
		
		CSMot = Motions.LM;
		
		LoadWithWind(Snding, Info);
	} else if (N == "CM"){
		RM.innerHTML = "Load Right Motion";
		LM.innerHTML = "Load Left Motion";
		CM.innerHTML = "Currently Loaded: Custom Motion";
		
		let Angg = parseFloat(Ang)%360 || 0;
		let Spdd = parseFloat(Spd) || 10;
		Spdd = clamp(Spdd, 0, 100);
		
		let Mots = ConvertPolartoCart({WD: Angg, WS: Spdd});
		
		CUMot = Mots;
		CUMot.y *= -1;
		CSMot = CUMot;
		
		
		LoadWithWind(Snding, Info);
	} 
}

function LoadNewSfc(N){	
	let tmpc = document.getElementById("Temp").value;
	let dwpt = document.getElementById("Dewp").value;
	
	if (N == "New"){
		let TMPC = FtoC(parseFloat(tmpc)) || rStart.T;
		TMPC = clamp(TMPC, -78, 212);
		let DWPC = FtoC(parseFloat(dwpt)) || rStart.D;
		DWPC = clamp(DWPC, -79, TMPC);
		
		let VTemp = virtemp(rStart.P, TMPC, TMPC);
		let WBulb = wetbulb(rStart.P, TMPC, DWPC);
		
		let nSlice = rStart;
		
		nSlice.VT = VTemp;
		nSlice.T = TMPC;
		nSlice.D = DWPC;
		nSlice.WB = WBulb;
		let Sound = Snding.Sounding;
		Sound.D[0] = DWPC;
		Sound.DW[0].D = DWPC;
		Sound.TW[0].T = TMPC;
		Sound.TW[0].VT = VTemp;
		Sound.TW[0].WB = WBulb;
		Sound.T[0] = TMPC;
		Sound.Slice[0] = ConvertToRaw(nSlice);
		
		DrawSkewT(Snding, false, true);
	} else if (N == "Old"){
		let nSlice = relStart;
		let TMPC = nSlice.T;
		let DWPC = nSlice.D;
		let WBulb = nSlice.WB;
		let VTemp = nSlice.VT;
		let Sound = Snding.Sounding;
		Sound.D[0] = DWPC;
		Sound.DW[0].D = DWPC;
		Sound.TW[0].T = TMPC;
		Sound.TW[0].VT = VTemp;
		Sound.TW[0].WB = WBulb;
		Sound.T[0] = TMPC;
		Sound.Slice[0] = ConvertToRaw(nSlice);
		
		DrawSkewT(Snding, false);
	}
}

function LoadNewParcel(N){
	let SB = document.getElementById("ParcelSB");
	let ML = document.getElementById("ParcelML");
	let MU = document.getElementById("ParcelMU");
	let CU = document.getElementById("ParcelCU");
	
	let Pres = document.getElementById("ParcelStart").value;
	
	if (N == "SB"){
		SB.innerHTML = "Currently Loaded: Surface-Based Parcel";
		ML.innerHTML = "Load Mixed-Layer Parcel";
		MU.innerHTML = "Load Most-Unstable Parcel";
		CU.innerHTML = "Load Custom-Pressure Parcel";
		DP = Info.SBParcel;
		LoadWithParcel(Snding, DP, Info);
	} else if (N == "ML"){
		SB.innerHTML = "Load Surface-Based Parcel";
		ML.innerHTML = "Currently Loaded: Mixed-Layer Parcel";
		MU.innerHTML = "Load Most-Unstable Parcel";
		CU.innerHTML = "Load Custom-Pressure Parcel";
		
		DP = Info.MLParcel;
		LoadWithParcel(Snding, DP, Info);
	} else if (N == "MU"){
		SB.innerHTML = "Load Surface-Based Parcel";
		ML.innerHTML = "Load Mixed-Layer Parcel";
		MU.innerHTML = "Currently Loaded: Most-Unstable Parcel";
		CU.innerHTML = "Load Custom-Pressure Parcel";
		DP = Info.MUParcel;
		LoadWithParcel(Snding, DP, Info);
	} else if (N == "CU"){
		SB.innerHTML = "Load Surface-Based Parcel";
		ML.innerHTML = "Load Mixed-Layer Parcel";
		MU.innerHTML = "Load Most-Unstable Parcel";
		CU.innerHTML = "Currently Loaded: Custom-Pressure Parcel";
		
		Pressure = parseFloat(Pres) || 900;
		
		let Max = GetLayerByPres(Snding.Sounding, "Last");
		
		Pressure = clamp(Pressure, Max.P,Info.SBParcel.Start.P);

		DP = LiftParcel(Snding.Sounding, "CU", Pressure);
		CUPrcl = DP;
		LoadWithParcel(Snding, DP, Info);
	}
}

function GetNumFromRange(V, B, T){
	return (B-V)/(B-T);
}

function Process(text){
  let Json = {
    Sounding : {
      T : [],
      D : [],
      W : [],
      H : [],
      P : [],
      TW : [],
	  SRW : [],
      DW : [],
      Slice : [],
	  OMEGA : [],
    },
    Len : 0,
  };
  
  let Info = text;
  if (Info == null) {
      console.error("Error reading the file");
      return false;
    }

    

    //Build the Return JSON Object
    let Lines = Info.split("\n");
    let Split = Info.split("%RAW%");
    
    Json.Title = Lines[1];

    Split = Split[1].split("%END%");
    let PL = Split[0].split("\n");
 // let PL = Pr[1].split("%END%");

    Json.Len = PL.length;

  let DWL = 0;
  let TWL = 0;
  let WWL = 0;

  let SFCLayer = 9999;
  let sfc = PL[1].split(",");
  
  let GoodData = [];

  for (let x=0;x<sfc.length;x++){
    sfc[x] = parseFloat(sfc[x]);
  }

    for (let i = 0; i < PL.length; i++){
      let Ln = PL[i].split(",");
	  
	  if (Ln.length == 1){
		  continue;
	  }
	  
	  
      for (let x=0;x<Ln.length;x++){
        Ln[x] = parseFloat(Ln[x]);
      }
	  
	  Ln[Ln.length] = wetbulb(parseFloat(Ln[0]), parseFloat(Ln[2]), parseFloat(Ln[3]))
	  
	  if (Ln[2] == -9999 && Ln[3] == -9999 && Ln[4] == -9999 && Ln[5] == -9999){
		continue;
	  }
	  
	  if (Ln[2] != -9999 && Ln[3] != -9999 && Ln[4] != -9999 && Ln[5] != -9999){
		GoodData.push(Json.Sounding.Slice.length);
	  }

	  
	  

      Json.Sounding.P.push(parseFloat(Ln[0]));
      Json.Sounding.H.push(parseFloat(Ln[1]));
      Json.Sounding.T.push(parseFloat(Ln[2]));
      Json.Sounding.D.push(parseFloat(Ln[3]));
      if (parseFloat(Ln[5]) != -9999 && !isNaN(parseFloat(Ln[5]))){
        Json.Sounding.W.push(
          {WD: parseFloat(Ln[4]), WS: parseFloat(Ln[5]), H: parseFloat(Ln[1])}
        );
        WWL += 1;
        SFCLayer = Math.min(SFCLayer, i);
      };

      if (parseFloat(Ln[2]) != -9999 && !isNaN(parseFloat(Ln[2]))){
        Json.Sounding.TW.push(
          {T: parseFloat(Ln[2]), VT: VirtTemp(Ln, sfc[0], true, true), WB: Ln[6], P: parseFloat(Ln[0]), H: parseFloat(Ln[1])}
        );
        TWL += 1;

        SFCLayer = Math.min(SFCLayer, i);
      };

      if (parseFloat(Ln[3]) != -9999 && !isNaN(parseFloat(Ln[3]))){
        Json.Sounding.DW.push(
          {D: parseFloat(Ln[3]), P: parseFloat(Ln[0]), H: parseFloat(Ln[1])}
        );
        DWL += 1;

        SFCLayer = Math.min(SFCLayer, i);
      };
	  
	  
      
      Json.Sounding.Slice.push(Ln);
	  Json.Sounding.OMEGA.push(Ln[7]);
  }

  Json.DWL = DWL;
  Json.TWL = TWL;
  Json.WWL = WWL;
  
  //Fix -9999 Missing data
  
  // console.log(Json.Sounding.Slice, GoodData);
  
  let Iterator = 0;
  let NewSlices = Json.Sounding.Slice;
  
  if (GoodData.length < 1){
	  
  } else {
	  let Bottom = Json.Sounding.Slice[GoodData[0]];
	  let Top = Json.Sounding.Slice[GoodData[1]];
	  
	  for (let i = 0; i < Json.Sounding.Slice.length; i++){
		  if (GoodData.indexOf(i) != -1){
			Bottom = Json.Sounding.Slice[i];
			
			if ((GoodData.indexOf(i)+1) >= GoodData.length){
				break;
			}
			Top = Json.Sounding.Slice[Math.min(Json.Sounding.Slice.length-1, GoodData[GoodData.indexOf(i)+1])];
		  } else {
			let S = Json.Sounding.Slice[i];
			let LerpFactor = clamp(GetNumFromRange(S[1], Bottom[1], Top[1]), 0, 1);
			
			for (let a = 2; a < S.length; a++){
				if (S[a] == -9999){
					S[a] = Lerp(Bottom[a], Top[a], LerpFactor);
				}
			}
		  }
	  }
  }


  return Json;
}

function SetTitle(K){
	const Canv = document.getElementById("skewTTitle");
  const ctx = Canv.getContext("2d");

  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.fillRect(0,0,1000,1000);

  Canv.width = 800;//Canv.style.width;
  Canv.height = 40;
  
  if (K.Title.length > 35){
	  ctx.font = `bold ${Canv.width/45}px sans-serif`;
  } else {
	  ctx.font = `bold ${Canv.width/25}px sans-serif`;
  }
  
  
  ctx.fillStyle = `rgba(255,255,255,1)`;
  ctx.fillText(`${K.Title}`, 0.025 * Canv.width, 30);
  ctx.fillRect(25, 36, 725, 1);
}

async function GetFile(fName){
  console.log(Date.now());

 fetch(fName)
  .then(r=>r.text())
  .then(text => Load(text));  
}

function DewFromTRh(T, Rh){
	let N = (ln(Rh/100) + ((17.27 * T)/(237.3 + T)))/17.27;
	return (237.7 * N)/(1-N);
}

function GetAngleFromVector(B){
	return Math.atan2(-B.x, -B.y) * (180/Math.PI);
}

function ln(x) {
  return Math.log(x) / Math.log(Math.E);
}

function ProcessJSON(Json){
  let Rtable = {
    Sounding : {
      T : [],
      D : [],
      W : [],
      H : [],
      P : [],
      TW : [],
      DW : [],
	  SRW : [],
      Slice : [],
	  OMEGA : [],
    },
    Len : 0,
	Title : '',
  };
  
  //Build Title
  Rtable.Title = `${Json.model}`;
  let Dte = Json.date;
  
  let FH = parseFloat(Json.fh);
  let JSR = parseFloat(Json.run);
  
  if (JSR < 10){
	 JSR = `0${JSR}`;
  } else {
	  JSR = `${JSR}`;
  }
  
  if (FH >= 10 && FH < 100){
	  FH = `0${FH}`
  } else if (FH < 10){
	  FH = `00${FH}`
  }
  
  
  
  let P = Dte.substring(4,6);
  
  let FlatDate = new Date(`${Dte.substring(4,6)}/${Dte.substring(6)}/${Dte.substring(0, 4)} ${JSR}:00:00 GMT+00:00`);
  let NewDate = new Date(FlatDate.getTime() + 3600000 * parseFloat(Json.fh));

  let year = NewDate.getFullYear();
  let month = NewDate.getDate(); // Month is 0-indexed, so add 1
  let day = NewDate.getMonth()+1;
  let hour = NewDate.getHours();
  if (hour < 10){
	  hour = `0${hour}`;
  }
  
  if (month < 10){
	  month = `0${month}`;
  }
  
  if (day < 10){
	  day = `0${day}`;
  }
  
  
  let VH = `${day}-${month}-${year} ${hour}Z`;
  
  let Location = `${Math.abs(Json.lat)}${json.lat > 0 && "N" || "S"}, ${Math.abs(Json.lon)}${json.lon > 0 && "E" || "W"}`
  
  let RDte = `${Dte.substring(4,6)}-${Dte.substring(6)}-${Dte.substring(0, 4)} ${Json.run}Z - F${FH};  Valid: ${VH};  LOCATION: ${Location}`;
  Rtable.Title = Rtable.Title+` ${RDte}`;
  
  let DWL = 0;
  let TWL = 0;
  let WWL = 0;

  let SFCLayer = 9999;
  let sfc;
  
  let Info = {};
  
  for (var N in Json){
	 if (Array.isArray(Json[N])){
		 Info[N] = JSON.parse(Json[N]);
	 } else {
		 Info[N] = Json[N];
	 }
	 
  }
  let Vars = Info.variables;
  
  let Varst = Vars.Temperature;
  let Varsvvel = Vars["Vertical velocity (pressure)"];
  let Varsrh = Vars["Relative humidity"];
  let Varsv = Vars["v-component of wind"];
  let Varsu = Vars["u-component of wind"];
  let Varsh = Vars["height"] || false;
  let Varsp = Vars["Pressure"] || false;
  
  
  Rtable.Len = Vars["u-component of wind"].length.length;
  
  //Convert To Sounding
  for (let i = Vars["u-component of wind"].length-1; i >= 0 ; i--){
	  //h,p,t,d,ws,wd,wb,om
	let T = Varst[i] - 273.15;
	let H = Varsh && Varsh[Varst.length-1-i] || 250 * (Varst.length-1-i);//Json.t[i];
	let P = Varsp && Varsp[Varst.length-1-i] || 1000 - 25 * (Varst.length-1-i);
	let D = DewFromTRh(T, Varsrh[i]);
	let WindVec = {x: Varsu[i], y:Varsv[i]};
	let WS = Mag(WindVec);
	let WD = GetAngleFromVector(WindVec)+360;
	let Omega = Math.round(10000 *-Varsvvel[i])/1000000;
	let WB = wetbulb(P, T, D);
	let Slice = [P,H,T,D,WD,WS,WB,Omega];
	
	if (i == Varst.length - 1){
		sfc = Slice;
	}
	
	Rtable.Sounding.T.push(T);
	Rtable.Sounding.D.push(D);
	Rtable.Sounding.P.push(P);
	Rtable.Sounding.H.push(H);
	Rtable.Sounding.OMEGA.push(Omega);
	
	if (parseFloat(Slice[5]) != -9999 && !isNaN(parseFloat(Slice[5]))){
        Rtable.Sounding.W.push(
          {WD: parseFloat(WD), WS: parseFloat(WS), H: parseFloat(Slice[1])}
        );
        WWL += 1;
        SFCLayer = Math.min(SFCLayer, i);
      };

      if (parseFloat(Slice[2]) != -9999 && !isNaN(parseFloat(Slice[2]))){
        Rtable.Sounding.TW.push(
          {T: parseFloat(Slice[2]), VT: VirtTemp(Slice, sfc[0], true, true), WB: Slice[6], P: parseFloat(Slice[0]), H: parseFloat(Slice[1])}
        );
        TWL += 1;

        SFCLayer = Math.min(SFCLayer, i);
      };

      if (parseFloat(Slice[3]) != -9999 && !isNaN(parseFloat(Slice[3]))){
        Rtable.Sounding.DW.push(
          {D: parseFloat(Slice[3]), P: parseFloat(Slice[0]), H: parseFloat(Slice[1])}
        );
        DWL += 1;

        SFCLayer = Math.min(SFCLayer, i);
      };
	
	
	
	Rtable.Sounding.Slice.push(Slice);
  }
  
  Rtable.DWL = DWL;
  Rtable.TWL = TWL;
  Rtable.WWL = WWL;
  
  return Rtable;
}

function Load(text, processed=false){
  console.log(Date.now()/1000, " Start time");
  let K = text;
  if (!processed){
	  K = Process(text);
  }
  
  Clean()
	console.log(K);
  SetTitle(K);

  DrawSkewT(K, true);
  console.log(Date.now()/1000, " Finish time");
}

let json = {
  "model": "hrrr",
  "date": "20250313",
  "run": "18",
  "fh": "3",
  "lat": 27.9814,
  "lon": -101.6585,
  "variables": {
    "Relative humidity": [
      10.758187,
      6.6320596,
      7.4073195,
      9.510014,
      19.53661,
      52.578323,
      69.29958,
      63.118546,
      64.190796,
      59.209187,
      46.497734,
      34.40229,
      24.509462,
      17.219313,
      12.077937,
      8.531204,
      6.9130015,
      6.6202116,
      6.7192583,
      7.4321055,
      7.7810383,
      7.87721,
      7.7471714,
      7.8372517,
      9.805959,
      14.979175,
      18.107342,
      18.026855,
      17.07075,
      17.00352,
      15.178544,
      13.574486,
      12.074152,
      10.948833,
      10.823532,
      10.823253,
      10.822996
    ],
    "u-component of wind": [
      47.030487,
      49.58179,
      49.753284,
      59.08316,
      62.101505,
      55.957832,
      51.73865,
      49.106033,
      46.047318,
      41.19982,
      36.86717,
      34.67138,
      32.71675,
      29.937996,
      26.733013,
      23.695839,
      21.546125,
      20.358843,
      19.537271,
      19.253826,
      18.895397,
      18.423214,
      17.84558,
      17.18349,
      15.805034,
      12.311951,
      9.666285,
      8.689009,
      7.463027,
      7.1336136,
      6.8247128,
      6.499981,
      6.1633177,
      5.5258236,
      4.9055786,
      4.8536663,
      4.908922
    ],
"Pressure": [
     690.0, 665.25, 641.0, 617.25, 594.0, 571.25, 549.0, 527.25, 506.0, 485.25, 465.0, 445.25, 426.0, 407.25, 389.0, 371.25, 354.0, 337.25, 321.0, 305.25, 290.0, 275.25, 261.0, 247.25, 234.0, 221.25, 209.0, 197.25, 186.0, 175.25, 165.0, 155.25, 146.0, 137.25, 129.0, 121.25
    ],
    "v-component of wind": [
      1.202179,
      7.4216843,
      5.735401,
      7.19232,
      12.688446,
      9.630905,
      9.844185,
      12.356262,
      11.913059,
      10.153671,
      10.225487,
      11.019985,
      10.553268,
      9.503529,
      8.716446,
      8.292915,
      8.31773,
      8.193089,
      7.902069,
      7.494362,
      7.0737495,
      6.671261,
      6.337345,
      6.1877937,
      6.331352,
      5.9714203,
      5.667263,
      5.48036,
      5.2426186,
      5.1902018,
      5.1487093,
      5.059988,
      4.876034,
      4.516964,
      3.985098,
      3.963684,
      3.9681273
    ],
    "Temperature": [
      200.62859,
      206.1434,
      211.61877,
      215.00497,
      218.01605,
      221.28644,
      225.57079,
      231.09659,
      236.09415,
      240.3678,
      244.5328,
      248.5878,
      252.26642,
      255.47232,
      258.3725,
      260.91107,
      263.20163,
      265.4113,
      267.47598,
      269.6161,
      271.8153,
      273.9658,
      276.01517,
      277.95245,
      279.6772,
      281.28406,
      283.1283,
      285.34647,
      287.64035,
      290.02206,
      292.56793,
      295.0471,
      297.50372,
      300.10492,
      301.66605,
      303.17175,
      304.6458
    ],
    "Vertical velocity (pressure)": [
      0.1535151,
      0.1475153,
      0.043843746,
      -0.05202198,
      -0.14152145,
      -0.25407028,
      -0.33434296,
      -0.37417984,
      -0.39445305,
      -0.44395828,
      -0.49552727,
      -0.57417107,
      -0.5975094,
      -0.6258564,
      -0.6137123,
      -0.5990448,
      -0.54291534,
      -0.46713257,
      -0.40459824,
      -0.27238464,
      -0.16208267,
      -0.05027771,
      0.028215408,
      0.112550735,
      0.14227295,
      0.13506508,
      0.086089134,
      0.04762268,
      0.031000137,
      -0.011023521,
      -0.015612602,
      -0.06512642,
      -0.07479572,
      -0.09237337,
      -0.09402847,
      -0.09402847,
      -0.09402847
    ]
  }
}


function LoadAnimate(text, Num, pos, processed=false){
  let K = text;
  if (!processed){
	  K = Process(text);
  }
  
  Push ++;
  Animation[pos-1] = K;
  
  if (Num == Push){
	 console.log("OKAY");
	 BeginAnimation();
  }
  
  return K;
}

let Animation = [];
let Push = 0;

function GetFileRaw(fName, L, n){
	fetch(fName)
	.then(r=>r.text())
	.then(text => LoadAnimate(text, L, n)); 
}

function AnimLoad(K){
  Clean();
  console.log(K);
  SetTitle(K);

  DrawSkewT(K, false);
}

let Delay = 1000;
let Animating = false;
let StartDelay = 2000;
let AnimText = document.getElementById("AnimTxt");

function BeginAnimation(){
	setTimeout(() => {
		Animating = true;
		AnimText.style.visibility = "hidden";
		for (let i = 0; i < Animation.length; i++){
			setTimeout(()=>{
				AnimLoad(Animation[i])
			}, Delay*(i));
		}
	}, StartDelay);
}
let N = 0;
function AnimateText(){
	if (N%6 == 0){
		AnimText.innerHTML = "Loading Animation...";
	} else if (N%6 == 1){
		AnimText.innerHTML = "Loading Animation..";
	} else if (N%6 == 2){
		AnimText.innerHTML = "Loading Animation.";
	} else if (N%6 == 3){
		AnimText.innerHTML = "Loading Animation";
	} else if (N%6 == 4){
		AnimText.innerHTML = "Loading Animation.";
	} else if (N%6 == 5){
	    AnimText.innerHTML = "Loading Animation..";
	} 
	
	N++;
	
	if (!Animating){
		setTimeout(() => {AnimateText()}, 100);
	}
	
}

function Animate(d=1000, sd=2000){
	let FileList = [
	"Soundings/sounding_20110409_15_Mapleton_IA.txt",
	"Soundings/sounding_20110409_16_Mapleton_IA.txt",
	"Soundings/sounding_20110409_17_Mapleton_IA.txt",
	"Soundings/sounding_20110409_18_Mapleton_IA.txt",
	"Soundings/sounding_20110409_19_Mapleton_IA.txt",
	"Soundings/sounding_20110409_20_Mapleton_IA.txt",
	"Soundings/sounding_20110409_21_Mapleton_IA.txt",
	"Soundings/sounding_20110409_22_Mapleton_IA.txt",
	"Soundings/sounding_20110409_23_Mapleton_IA.txt",
	];
	Delay = d;
	StartDelay = sd;
	StartDelay = sd;
	AnimText.style.visibility = "visible";
	
	Animation = [];
	
	
	let Iter = 0;
	FileList.forEach((F) => {
		Iter++;
		GetFileRaw(F, FileList.length, Iter);
	});

	AnimateText();
}

//let NA = ProcessJSON(json);
//Load(NA, true);
let NB = GetFile("Other26.OAX");
//Animate(500);