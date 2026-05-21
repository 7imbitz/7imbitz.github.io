/* CVSS v4.0 Base Score Calculator
 * 3-layer layout with icons. SC/SI/SA default to None.
 * Scoring logic based on FIRST CVSS v4.0 specification.
 */

// ---- Lookup Tables ----
var cvssLookupV4 = {
    "000000":10,"000001":9.9,"000010":9.8,"000011":9.5,"000020":9.5,"000021":9.2,
    "000100":10,"000101":9.6,"000110":9.3,"000111":8.7,"000120":9.1,"000121":8.1,
    "000200":9.3,"000201":9,"000210":8.9,"000211":8,"000220":8.1,"000221":6.8,
    "001000":9.8,"001001":9.5,"001010":9.5,"001011":9.2,"001020":9,"001021":8.4,
    "001100":9.3,"001101":9.2,"001110":8.9,"001111":8.1,"001120":8.1,"001121":6.5,
    "001200":8.8,"001201":8,"001210":7.8,"001211":7,"001220":6.9,"001221":4.8,
    "002001":9.2,"002011":8.2,"002021":7.2,"002101":7.9,"002111":6.9,"002121":5,
    "002201":6.9,"002211":5.5,"002221":2.7,"010000":9.9,"010001":9.7,"010010":9.5,
    "010011":9.2,"010020":9.2,"010021":8.5,"010100":9.5,"010101":9.1,"010110":9,
    "010111":8.3,"010120":8.4,"010121":7.1,"010200":9.2,"010201":8.1,"010210":8.2,
    "010211":7.1,"010220":7.2,"010221":5.3,"011000":9.5,"011001":9.3,"011010":9.2,
    "011011":8.5,"011020":8.5,"011021":7.3,"011100":9.2,"011101":8.2,"011110":8,
    "011111":7.2,"011120":7,"011121":5.9,"011200":8.4,"011201":7,"011210":7.1,
    "011211":5.2,"011220":5,"011221":3,"012001":8.6,"012011":7.5,"012021":5.2,
    "012101":7.1,"012111":5.2,"012121":2.9,"012201":6.3,"012211":2.9,"012221":1.7,
    "100000":9.8,"100001":9.5,"100010":9.4,"100011":8.7,"100020":9.1,"100021":8.1,
    "100100":9.4,"100101":8.9,"100110":8.6,"100111":7.4,"100120":7.7,"100121":6.4,
    "100200":8.7,"100201":7.5,"100210":7.4,"100211":6.3,"100220":6.3,"100221":4.9,
    "101000":9.4,"101001":8.9,"101010":8.8,"101011":7.7,"101020":7.6,"101021":6.7,
    "101100":8.6,"101101":7.6,"101110":7.4,"101111":5.8,"101120":5.9,"101121":5,
    "101200":7.2,"101201":5.7,"101210":5.7,"101211":5.2,"101220":5.2,"101221":2.5,
    "102001":8.3,"102011":7,"102021":5.4,"102101":6.5,"102111":5.8,"102121":2.6,
    "102201":5.3,"102211":2.1,"102221":1.3,"110000":9.5,"110001":9,"110010":8.8,
    "110011":7.6,"110020":7.6,"110021":7,"110100":9,"110101":7.7,"110110":7.5,
    "110111":6.2,"110120":6.1,"110121":5.3,"110200":7.7,"110201":6.6,"110210":6.8,
    "110211":5.9,"110220":5.2,"110221":3,"111000":8.9,"111001":7.8,"111010":7.6,
    "111011":6.7,"111020":6.2,"111021":5.8,"111100":7.4,"111101":5.9,"111110":5.7,
    "111111":5.7,"111120":4.7,"111121":2.3,"111200":6.1,"111201":5.2,"111210":5.7,
    "111211":2.9,"111220":2.4,"111221":1.6,"112001":7.1,"112011":5.9,"112021":3,
    "112101":5.8,"112111":2.6,"112121":1.5,"112201":2.3,"112211":1.3,"112221":0.6,
    "200000":9.3,"200001":8.7,"200010":8.6,"200011":7.2,"200020":7.5,"200021":5.8,
    "200100":8.6,"200101":7.4,"200110":7.4,"200111":6.1,"200120":5.6,"200121":3.4,
    "200200":7,"200201":5.4,"200210":5.2,"200211":4,"200220":4,"200221":2.2,
    "201000":8.5,"201001":7.5,"201010":7.4,"201011":5.5,"201020":6.2,"201021":5.1,
    "201100":7.2,"201101":5.7,"201110":5.5,"201111":4.1,"201120":4.6,"201121":1.9,
    "201200":5.3,"201201":3.6,"201210":3.4,"201211":1.9,"201220":1.9,"201221":0.8,
    "202001":6.4,"202011":5.1,"202021":2,"202101":4.7,"202111":2.1,"202121":1.1,
    "202201":2.4,"202211":0.9,"202221":0.4,"210000":8.8,"210001":7.5,"210010":7.3,
    "210011":5.3,"210020":6,"210021":5,"210100":7.3,"210101":5.5,"210110":5.9,
    "210111":4,"210120":4.1,"210121":2,"210200":5.4,"210201":4.3,"210210":4.5,
    "210211":2.2,"210220":2,"210221":1.1,"211000":7.5,"211001":5.5,"211010":5.8,
    "211011":4.5,"211020":4,"211021":2.1,"211100":6.1,"211101":5.1,"211110":4.8,
    "211111":1.8,"211120":2,"211121":0.9,"211200":4.6,"211201":1.8,"211210":1.7,
    "211211":0.7,"211220":0.8,"211221":0.2,"212001":5.3,"212011":2.4,"212021":1.4,
    "212101":2.4,"212111":1.2,"212121":0.5,"212201":1,"212211":0.3,"212221":0.1
};
var maxSeverityV4 = {
    "eq1":{0:1,1:4,2:5},"eq2":{0:1,1:2},
    "eq3eq6":{0:{0:7,1:6},1:{0:8,1:8},2:{1:10}},
    "eq4":{0:6,1:5,2:4},"eq5":{0:1,1:1,2:1}
};
var maxComposed = {
    "eq1":{0:["AV:N/PR:N/UI:N/"],1:["AV:A/PR:N/UI:N/","AV:N/PR:L/UI:N/","AV:N/PR:N/UI:P/"],2:["AV:P/PR:N/UI:N/","AV:A/PR:L/UI:P/"]},
    "eq2":{0:["AC:L/AT:N/"],1:["AC:H/AT:N/","AC:L/AT:P/"]},
    "eq3":{0:{"0":["VC:H/VI:H/VA:H/CR:H/IR:H/AR:H/"],"1":["VC:H/VI:H/VA:L/CR:M/IR:M/AR:H/","VC:H/VI:H/VA:H/CR:M/IR:M/AR:M/"]},1:{"0":["VC:L/VI:H/VA:H/CR:H/IR:H/AR:H/","VC:H/VI:L/VA:H/CR:H/IR:H/AR:H/"],"1":["VC:L/VI:H/VA:L/CR:H/IR:M/AR:H/","VC:L/VI:H/VA:H/CR:H/IR:M/AR:M/","VC:H/VI:L/VA:H/CR:M/IR:H/AR:M/","VC:H/VI:L/VA:L/CR:M/IR:H/AR:H/","VC:L/VI:L/VA:H/CR:H/IR:H/AR:M/"]},2:{"1":["VC:L/VI:L/VA:L/CR:H/IR:H/AR:H/"]}},
    "eq4":{0:["SC:H/SI:S/SA:S/"],1:["SC:H/SI:H/SA:H/"],2:["SC:L/SI:L/SA:L/"]},
    "eq5":{0:["E:A/"],1:["E:P/"],2:["E:U/"]}
};

// ---- Scoring Functions ----
function cvss4_metric(cs, m) {
    var s = cs[m];
    if (m === "E" && s === "X") return "A";
    if (m === "CR" && s === "X") return "H";
    if (m === "IR" && s === "X") return "H";
    if (m === "AR" && s === "X") return "H";
    if (cs.hasOwnProperty("M" + m)) { var mv = cs["M" + m]; if (mv !== "X") return mv; }
    return s;
}
function extractVM(metric, str) { var e = str.slice(str.indexOf(metric) + metric.length + 1); var p = e.indexOf('/'); return p > 0 ? e.substring(0, p) : e; }
function getEQMaxes(lk, eq) { return maxComposed["eq" + eq][lk[eq - 1]]; }

function macroVector(cs) {
    var eq1=0,eq2=0,eq3=0,eq4=0,eq5=0,eq6=0;
    var AV=cvss4_metric(cs,"AV"),PR=cvss4_metric(cs,"PR"),UI=cvss4_metric(cs,"UI");
    var AC=cvss4_metric(cs,"AC"),AT=cvss4_metric(cs,"AT");
    var VC=cvss4_metric(cs,"VC"),VI=cvss4_metric(cs,"VI"),VA=cvss4_metric(cs,"VA");
    var SC=cvss4_metric(cs,"SC"),SI=cvss4_metric(cs,"SI"),SA=cvss4_metric(cs,"SA");
    var MSI=cvss4_metric(cs,"MSI"),MSA=cvss4_metric(cs,"MSA");
    var E_=cvss4_metric(cs,"E"),CR=cvss4_metric(cs,"CR"),IR=cvss4_metric(cs,"IR"),AR=cvss4_metric(cs,"AR");
    if (AV==="N"&&PR==="N"&&UI==="N") eq1=0;
    else if ((AV==="N"||PR==="N"||UI==="N")&&!(AV==="N"&&PR==="N"&&UI==="N")&&AV!=="P") eq1=1;
    else eq1=2;
    eq2=(AC==="L"&&AT==="N")?0:1;
    if (VC==="H"&&VI==="H") eq3=0;
    else if (!(VC==="H"&&VI==="H")&&(VC==="H"||VI==="H"||VA==="H")) eq3=1;
    else eq3=2;
    if (MSI==="S"||MSA==="S") eq4=0;
    else if (!(MSI==="S"||MSA==="S")&&(SC==="H"||SI==="H"||SA==="H")) eq4=1;
    else eq4=2;
    if (E_==="A") eq5=0; else if (E_==="P") eq5=1; else eq5=2;
    if ((CR==="H"&&VC==="H")||(IR==="H"&&VI==="H")||(AR==="H"&&VA==="H")) eq6=0; else eq6=1;
    return ""+eq1+eq2+eq3+eq4+eq5+eq6;
}

function cvss4_score(cs, lk, msd, mv) {
    var AL={"N":0,"A":0.1,"L":0.2,"P":0.3},PL={"N":0,"L":0.1,"H":0.2},UL={"N":0,"P":0.1,"A":0.2};
    var ACL={"L":0,"H":0.1},ATL={"N":0,"P":0.1};
    var VCL={"H":0,"L":0.1,"N":0.2},VIL={"H":0,"L":0.1,"N":0.2},VAL={"H":0,"L":0.1,"N":0.2};
    var SCL={"H":0.1,"L":0.2,"N":0.3},SIL={"S":0,"H":0.1,"L":0.2,"N":0.3},SAL={"S":0,"H":0.1,"L":0.2,"N":0.3};
    var CRL={"H":0,"M":0.1,"L":0.2},IRL={"H":0,"M":0.1,"L":0.2},ARL={"H":0,"M":0.1,"L":0.2};
    if (["VC","VI","VA","SC","SI","SA"].every(function(m){return cvss4_metric(cs,m)==="N";})) return 0;
    var val=lk[mv]; if (typeof val==='undefined') return 0;
    var e1=+mv[0],e2=+mv[1],e3=+mv[2],e4=+mv[3],e5=+mv[4],e6=+mv[5];
    var n1=""+(e1+1)+e2+e3+e4+e5+e6, n2=""+e1+(e2+1)+e3+e4+e5+e6;
    var n36="",n36l="",n36r="";
    if (e3===1&&e6===1) n36=""+e1+e2+(e3+1)+e4+e5+(e6+1);
    else if (e3===0&&e6===1) n36=""+e1+e2+(e3+1)+e4+e5+e6;
    else if (e3===1&&e6===0) n36=""+e1+e2+e3+e4+e5+(e6+1);
    else if (e3===0&&e6===0) { n36l=""+e1+e2+e3+e4+e5+(e6+1); n36r=""+e1+e2+(e3+1)+e4+e5+e6; }
    else n36=""+e1+e2+(e3+1)+e4+e5+(e6+1);
    var n4=""+e1+e2+e3+(e4+1)+e5+e6, n5=""+e1+e2+e3+e4+(e5+1)+e6;
    var s1=lk[n1],s2=lk[n2],s36=NaN;
    if (e3===0&&e6===0) { var sl=lk[n36l]||0,sr=lk[n36r]||0; s36=sl>sr?sl:sr; }
    else s36=lk[n36];
    var s4=lk[n4],s5=lk[n5];
    var m1=getEQMaxes(mv,1),m2=getEQMaxes(mv,2),m36=getEQMaxes(mv,3)[mv[5]],m4=getEQMaxes(mv,4),m5=getEQMaxes(mv,5);
    var mxv=[];
    for(var a=0;a<m1.length;a++)for(var b=0;b<m2.length;b++)for(var c=0;c<m36.length;c++)for(var d=0;d<m4.length;d++)for(var e=0;e<m5.length;e++) mxv.push(m1[a]+m2[b]+m36[c]+m4[d]+m5[e]);
    var sdAV=0,sdPR=0,sdUI=0,sdAC=0,sdAT=0,sdVC=0,sdVI=0,sdVA=0,sdSC=0,sdSI=0,sdSA=0,sdCR=0,sdIR=0,sdAR=0;
    for(var i=0;i<mxv.length;i++){
        var mv2=mxv[i];
        sdAV=AL[cvss4_metric(cs,"AV")]-AL[extractVM("AV",mv2)];
        sdPR=PL[cvss4_metric(cs,"PR")]-PL[extractVM("PR",mv2)];
        sdUI=UL[cvss4_metric(cs,"UI")]-UL[extractVM("UI",mv2)];
        sdAC=ACL[cvss4_metric(cs,"AC")]-ACL[extractVM("AC",mv2)];
        sdAT=ATL[cvss4_metric(cs,"AT")]-ATL[extractVM("AT",mv2)];
        sdVC=VCL[cvss4_metric(cs,"VC")]-VCL[extractVM("VC",mv2)];
        sdVI=VIL[cvss4_metric(cs,"VI")]-VIL[extractVM("VI",mv2)];
        sdVA=VAL[cvss4_metric(cs,"VA")]-VAL[extractVM("VA",mv2)];
        sdSC=SCL[cvss4_metric(cs,"SC")]-SCL[extractVM("SC",mv2)];
        sdSI=SIL[cvss4_metric(cs,"SI")]-SIL[extractVM("SI",mv2)];
        sdSA=SAL[cvss4_metric(cs,"SA")]-SAL[extractVM("SA",mv2)];
        sdCR=CRL[cvss4_metric(cs,"CR")]-CRL[extractVM("CR",mv2)];
        sdIR=IRL[cvss4_metric(cs,"IR")]-IRL[extractVM("IR",mv2)];
        sdAR=ARL[cvss4_metric(cs,"AR")]-ARL[extractVM("AR",mv2)];
        if([sdAV,sdPR,sdUI,sdAC,sdAT,sdVC,sdVI,sdVA,sdSC,sdSI,sdSA,sdCR,sdIR,sdAR].some(function(x){return x<0;})) continue;
        break;
    }
    var csd1=sdAV+sdPR+sdUI,csd2=sdAC+sdAT,csd36=sdVC+sdVI+sdVA+sdCR+sdIR+sdAR,csd4=sdSC+sdSI+sdSA;
    var ad1=val-s1,ad2=val-s2,ad36=val-s36,ad4=val-s4,ad5=val-s5;
    var ne=0,ns1=0,ns2=0,ns36=0,ns4=0,ns5=0;
    var ms1=msd.eq1[e1]*0.1,ms2=msd.eq2[e2]*0.1,ms36=msd.eq3eq6[e3][e6]*0.1,ms4=msd.eq4[e4]*0.1;
    if(!isNaN(ad1)){ne++;ns1=ad1*(csd1/ms1);}
    if(!isNaN(ad2)){ne++;ns2=ad2*(csd2/ms2);}
    if(!isNaN(ad36)){ne++;ns36=ad36*(csd36/ms36);}
    if(!isNaN(ad4)){ne++;ns4=ad4*(csd4/ms4);}
    if(!isNaN(ad5)){ne++;ns5=0;}
    var md=ne>0?(ns1+ns2+ns36+ns4+ns5)/ne:0;
    val-=md; if(val<0)val=0; if(val>10)val=10;
    return Math.round(val*10)/10;
}

function cvss4_calc(vec) {
    var cs={}; var parts=vec.split('/'); parts.shift();
    for(var i=0;i<parts.length;i++){var kv=parts[i].split(':');if(kv.length===2)cs[kv[0]]=kv[1];}
    if(!("E" in cs))cs["E"]="X"; if(!("CR" in cs))cs["CR"]="X"; if(!("IR" in cs))cs["IR"]="X"; if(!("AR" in cs))cs["AR"]="X";
    if(!("MSI" in cs))cs["MSI"]="X"; if(!("MSA" in cs))cs["MSA"]="X";
    if(cs["MSI"]==="X")cs["MSI"]=cs["SI"]||"N"; if(cs["MSA"]==="X")cs["MSA"]=cs["SA"]||"N";
    return cvss4_score(cs,cvssLookupV4,maxSeverityV4,macroVector(cs));
}

// ---- UI Calculator ----
var CVSS = function(id, opts) {
    this.opts = opts;
    var el = document.getElementById(id);
    this.el = el;
    var $ = function(t){return document.createElement(t);};

    this.groups = ['AV','AC','AT','PR','UI','VC','VI','VA','SC','SI','SA'];
    this.labels = {
        AV:'Attack Vector (AV)',AC:'Attack Complexity (AC)',AT:'Attack Requirements (AT)',
        PR:'Privileges Required (PR)',UI:'User Interaction (UI)',
        VC:'Conf. (VC)',VI:'Integ. (VI)',VA:'Avail. (VA)',
        SC:'Conf. (SC)',SI:'Integ. (SI)',SA:'Avail. (SA)'
    };
    this.metrics = {
        AV:{N:'Network',A:'Adjacent',L:'Local',P:'Physical'},
        AC:{L:'Low',H:'High'},AT:{N:'None',P:'Present'},
        PR:{N:'None',L:'Low',H:'High'},UI:{N:'None',P:'Passive',A:'Active'},
        VC:{H:'High',L:'Low',N:'None'},VI:{H:'High',L:'Low',N:'None'},VA:{H:'High',L:'Low',N:'None'},
        SC:{H:'High',L:'Low',N:'None'},SI:{H:'High',L:'Low',N:'None'},SA:{H:'High',L:'Low',N:'None'}
    };
    this.defaults = {AV:'N',AC:'L',AT:'N',PR:'N',UI:'N',SC:'N',SI:'N',SA:'N'};
    this.descs = {
        AV:{N:'The vulnerable component is bound to the network stack.',A:'Limited to logically adjacent topology.',L:'Not bound to network stack; local access required.',P:'Requires physical touch or manipulation.'},
        AC:{L:'Specialized conditions do not exist; repeatable success.',H:'Depends on conditions beyond attacker\'s control.'},
        AT:{N:'No specific conditions required.',P:'Specific conditions must be present.'},
        PR:{N:'No privileges required.',L:'Basic user capabilities required.',H:'Significant/administrative control required.'},
        UI:{N:'No user interaction required.',P:'Limited passive interaction required.',A:'Specific conscious user action required.'},
        VC:{H:'Total loss of confidentiality to vulnerable system.',L:'Some loss of confidentiality to vulnerable system.',N:'No loss of confidentiality to vulnerable system.'},
        VI:{H:'Total loss of integrity to vulnerable system.',L:'Some loss of integrity to vulnerable system.',N:'No loss of integrity to vulnerable system.'},
        VA:{H:'Total loss of availability to vulnerable system.',L:'Performance reduced or interruptions.',N:'No impact to availability of vulnerable system.'},
        SC:{H:'Total loss of confidentiality to subsequent system.',L:'Some loss of confidentiality to subsequent system.',N:'No loss of confidentiality to subsequent system.'},
        SI:{H:'Total loss of integrity to subsequent system.',L:'Some loss of integrity to subsequent system.',N:'No loss of integrity to subsequent system.'},
        SA:{H:'Total loss of availability to subsequent system.',L:'Performance reduced or interruptions.',N:'No impact to availability of subsequent system.'}
    };
    this.reg = {AV:'NALP',AC:'LH',AT:'NP',PR:'NLH',UI:'NPA',VC:'HLN',VI:'HLN',VA:'HLN',SC:'HLN',SI:'HLN',SA:'HLN'};
    this.bme = {};
    this.pngMap = {
        AV: {N:'AV1.png', A:'AV2.png', P:'AV3.png', L:'AV4.png'},
        PR: {N:'PR1.png', L:'PR2.png', H:'PR3.png'}
    };
    var me = this;

    var board = $('div'); board.id = 'cvssboard'; el.appendChild(board);

    var l1 = $('div'); l1.className = 'layer layer1';
    ['AV','AC','AT','PR','UI'].forEach(function(g){l1.appendChild(me._buildGroup(g,$));});
    board.appendChild(l1);

    var l2 = $('div'); l2.className = 'layer layer2';
    ['VC','VI','VA'].forEach(function(g){l2.appendChild(me._buildGroup(g,$));});
    board.appendChild(l2);

    var l3 = $('div'); l3.className = 'layer layer3';
    ['SC','SI','SA'].forEach(function(g){l3.appendChild(me._buildGroup(g,$));});
    board.appendChild(l3);

    var rl = $('div'); rl.className = 'layer result-layer';
    var rdl = $('dl'); rdl.className = 'result';
    this.resultDl = rdl;
    rdl.innerHTML = '<dt>SEVERITY · SCORE · VECTOR</dt>';
    var rdd = $('dd');
    var lbl = $('label'); lbl.className = 'results';
    this.severity = $('span'); this.severity.className = 'severity';
    this.score = $('span'); this.score.className = 'score';
    this.vector = $('a'); this.vector.className = 'vector';
    lbl.appendChild(this.severity); lbl.appendChild(this.score);
    lbl.appendChild(document.createTextNode(' ')); lbl.appendChild(this.vector);
    rdd.appendChild(lbl); rdl.appendChild(rdd); rl.appendChild(rdl);
    board.appendChild(rl);

    this._setDefault();
};

CVSS.prototype._buildGroup = function(g, $) {
    var dl = $('dl'); dl.className = g;
    var dt = $('dt'); dt.textContent = this.labels[g]; dl.appendChild(dt);
    var vals = this.metrics[g];
    for (var v in vals) {
        var dd = $('dd');
        var inp = $('input'); inp.type='radio'; inp.name=g; inp.value=v;
        inp.id = 'cvss'+g+v;
        this.bme[g+v] = inp;
        var me = this;
        inp.onchange = function(){me._onMetric(this);};
        dd.appendChild(inp);
        var lbl = $('label'); lbl.setAttribute('for',inp.id);
        var icon = $('span'); icon.className = 'icon';
        if (this.pngMap[g] && this.pngMap[g][v]) {
            var img = $('img');
            img.src = this.pngMap[g][v];
            img.width = 20; img.height = 20;
            img.alt = vals[v];
            icon.appendChild(img);
        } else {
            icon.innerHTML = cvssIcons[g][v];
        }
        lbl.appendChild(icon);
        var txt = $('span'); txt.className = 'val'; txt.textContent = vals[v];
        lbl.appendChild(txt);
        dd.appendChild(lbl);
        var sm = $('small'); sm.innerHTML = this.descs[g][v];
        dd.appendChild(sm);
        dl.appendChild(dd);
    }
    return dl;
};

CVSS.prototype._setDefault = function() {
    for (var g in this.defaults) {
        var v = this.defaults[g];
        if (this.bme[g+v]) this.bme[g+v].checked = true;
    }
    this._update();
};

CVSS.prototype._onMetric = function() {
    this._update();
};

CVSS.prototype._update = function() {
    var vec = 'CVSS:4.0';
    var sep = '/';
    for (var m in this.metrics) {
        var checked = null;
        var els = this.el.querySelectorAll('input[name="'+m+'"]');
        for (var i = 0; i < els.length; i++) {
            if (els[i].checked) { checked = els[i].value; break; }
        }
        if (checked) {
            vec += sep + m + ':' + checked;
        } else {
            vec += sep + m + ':_';
        }
    }
    this.vector.textContent = vec;
    var s = this._calc();
    this.score.textContent = s;
    var r = this._rating(s);
    this.severity.className = r.name + ' severity';
    this.severity.innerHTML = r.name + '<sub>' + r.bottom + ' - ' + r.top + '</sub>';
    this.severity.title = r.bottom + ' - ' + r.top;

    var bgColors = {
        'Critical': '#8B0000', 'High': '#CC0000',
        'Medium': '#CC9900', 'Low': '#7799CC', 'None': '#424a40', '?': '#424a40'
    };
    var color = bgColors[r.name] || '#424a40';
    this.resultDl.style.backgroundColor = color;
    this.resultDl.style.borderColor = color;

    if (this.opts && this.opts.onchange) this.opts.onchange();
};

CVSS.prototype._calc = function() {
    var val = {}; var ok = true;
    for (var p in this.metrics) {
        var els = this.el.querySelectorAll('input[name="'+p+'"]');
        val[p] = null;
        for (var i=0;i<els.length;i++) if(els[i].checked){val[p]=els[i].value;break;}
        if(!val[p]) ok=false;
    }
    if(!ok) return '?';
    var vec = 'CVSS:4.0';
    var order = ['AV','AC','AT','PR','UI','VC','VI','VA','SC','SI','SA'];
    for(var i=0;i<order.length;i++) vec += '/' + order[i] + ':' + val[order[i]];
    try { return cvss4_calc(vec); } catch(e) { return '?'; }
};

CVSS.prototype._rating = function(s) {
    var ratings = [{n:"None",b:0,t:0},{n:"Low",b:0.1,t:3.9},{n:"Medium",b:4,t:6.9},{n:"High",b:7,t:8.9},{n:"Critical",b:9,t:10}];
    for(var i=0;i<ratings.length;i++) if(s>=ratings[i].b&&s<=ratings[i].t) return {name:ratings[i].n,bottom:ratings[i].b,top:ratings[i].t};
    return {name:"?",bottom:"Not",top:"defined"};
};

CVSS.prototype.get = function() { return {score:this.score.textContent, vector:this.vector.textContent}; };

CVSS.prototype.set = function(vec) {
    var parts = vec.split('/');
    for (var i = 0; i < parts.length; i++) {
        var kv = parts[i].split(':');
        if (kv.length === 2 && this.metrics[kv[0]] && this.bme[kv[0]+kv[1]]) {
            this.bme[kv[0]+kv[1]].checked = true;
        }
    }
    this._update();
};
