const nav=document.getElementById('nav');
addEventListener('scroll',()=>nav.classList.toggle('scrolled',scrollY>24),{passive:true});
nav.classList.toggle('scrolled',scrollY>24);

/* reveals fora das features (features são reativas à rolagem, logo abaixo) */
const io=new IntersectionObserver(es=>{
  es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in-view');io.unobserve(e.target);}});
},{threshold:.16,rootMargin:'0px 0px -6% 0px'});
document.querySelectorAll('.reveal,.watch').forEach(el=>{if(!el.closest('.feat-block'))io.observe(el);});

/* ===== Features reativas à rolagem: progride ao descer, retrocede ao subir ===== */
(function(){
  const blocks=[...document.querySelectorAll('.feat-block')].filter(b=>b.id!=='vendas');
  if(!blocks.length)return;
  const reduceF=matchMedia('(prefers-reduced-motion:reduce)');
  const deskF=matchMedia('(min-width:900px)');
  const cl=v=>v<0?0:v>1?1:v;
  const ease=t=>1-Math.pow(1-t,3);
  const fmt=v=>v.toLocaleString('pt-BR');

  const feats=blocks.map((bl,i)=>{
    const txt=[...bl.querySelectorAll('.feat-txt .reveal')];
    const ui=bl.querySelector('.feat-ui');
    const items=[...bl.querySelectorAll('.revi, .cal i')];
    const bars=[...bl.querySelectorAll('.bar i, .pill i')];
    const counts=[...bl.querySelectorAll('[data-count]')].map(n=>{
      const t=parseInt((n.textContent||'').replace(/\D/g,''),10);
      return {n, raw:n.textContent.trim(), target:isFinite(t)?t:0};
    });
    // desliga transições dos elementos dirigidos por JS (scrub direto)
    const custom = ['pagamentos','tarefas','financeiro','agenda','clientes'].includes(bl.id);   // cenas próprias cuidam destes blocos
    if(!custom)[ui,...txt,...items,...bars].forEach(el=>{if(el)el.style.transition='none';});
    return {bl, txt, ui, items, bars, counts, odd:(i%2===0), lit:false, lp:-1, custom};
  });

  function apply(f,p){
    const desk=deskF.matches;
    // texto entra do seu lado, em cascata
    f.txt.forEach((el,i)=>{
      const lp=ease(cl((p-i*0.05)/0.34));
      el.style.opacity=lp;
      el.style.transform = desk
        ? `translate(${(1-lp)*32*(f.odd?-1:1)}px,${(1-lp)*14}px)`
        : `translateY(${(1-lp)*34}px)`;
    });
    // card entra do lado dele + escala
    if(f.ui){
      const cp=ease(cl(p/0.42));
      f.ui.style.opacity=cp;
      f.ui.style.transform = desk
        ? `translateX(${(1-cp)*48*(f.odd?1:-1)}px) scale(${0.965+0.035*cp})`
        : `translateY(${(1-cp)*34}px)`;
    }
    // itens internos em cascata (linhas, células do calendário)
    const M=Math.max(1,f.items.length);
    f.items.forEach((el,i)=>{
      const lp=ease(cl((p-(0.18+(i/M)*0.52))/0.16));
      el.style.opacity=lp;
      if(el.tagName==='I'&&el.parentElement&&el.parentElement.classList.contains('cal'))
        el.style.transform=`scale(${0.5+0.5*lp})`;
      else if(el.classList.contains('folder'))
        el.style.transform=`translateY(${(1-lp)*-13}px)`;
      else
        el.style.transform=`translateY(${(1-lp)*13}px)`;
    });
    // barras e pills crescem
    f.bars.forEach(el=>{
      const lp=ease(cl((p-0.28)/0.42));
      el.style.transform = el.parentElement.classList.contains('pill') ? `scaleY(${lp})` : `scaleX(${lp})`;
    });
    // números contam acompanhando a rolagem
    f.counts.forEach(c=>{
      if(!c.target)return;
      const lp=ease(cl((p-0.28)/0.5));
      c.n.textContent = lp>=1 ? c.raw : fmt(Math.round(lp*c.target));
    });
    // eventos-limiar (marca tarefa, risca, dia pulsa, selos pipocam) com histerese
    const lit = p > (f.lit?0.5:0.62);
    if(lit!==f.lit){f.lit=lit;f.bl.classList.toggle('lit',lit);}
  }

  function setFinal(f){
    if(f.custom)return;
    [f.ui,...f.txt,...f.items,...f.bars].forEach(el=>{if(el){el.style.opacity='';el.style.transform='';}});
    f.counts.forEach(c=>{c.n.textContent=c.raw;});
    f.bl.classList.add('lit');
  }

  let ticking=false;
  function onScroll(){
    if(ticking)return; ticking=true;
    requestAnimationFrame(()=>{
      ticking=false;
      if(reduceF.matches){feats.forEach(setFinal);return;}
      const vh=innerHeight||document.documentElement.clientHeight;
      for(const f of feats){
        if(f.custom)continue;
        const r=f.bl.getBoundingClientRect();
        if(r.bottom<-80||r.top>vh+80){           // fora da tela: fixa no extremo, uma vez
          const p=r.top>vh?0:1;
          if(f.lp!==p){f.lp=p;apply(f,p);}
          continue;
        }
        const p=cl((vh*0.85 - r.top)/(vh*0.55));
        if(Math.abs(p-f.lp)<0.002)continue;
        f.lp=p; apply(f,p);
      }
    });
  }
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',onScroll,{passive:true});
  deskF.addEventListener('change',()=>{feats.forEach(f=>f.lp=-1);onScroll();});
  reduceF.addEventListener('change',onScroll);
  addEventListener('load',onScroll);
  onScroll();
})();

/* ===== Vendas: cena com PIN — estaciona no centro; a rolagem anima os cards
   entrando da direita, o funil desliza e os "engole", e as barras animam;
   ao terminar, o pin solta e a página segue. Reversível ao subir. ===== */
(function(){
  const track=document.querySelector('#vendas');
  if(!track)return;
  const cards=[...track.querySelectorAll('.sale-card')];
  const stack=track.querySelector('.sale-stack');
  const funil=track.querySelector('.funil-slide');
  const txt=[...track.querySelectorAll('.feat-txt .reveal')];
  const rows=[...track.querySelectorAll('.funil-row')];
  const bars=[...track.querySelectorAll('.bar i')];
  const counts=[...track.querySelectorAll('[data-count]')].map(n=>{
    const t=parseInt((n.textContent||'').replace(/\D/g,''),10);
    return {n, raw:n.textContent.trim(), target:isFinite(t)?t:0};
  });
  const reduceF=matchMedia('(prefers-reduced-motion:reduce)');
  const deskF=matchMedia('(min-width:900px)');
  const cl=v=>v<0?0:v>1?1:v;
  const ease=t=>1-Math.pow(1-t,3);
  const fmt=v=>v.toLocaleString('pt-BR');
  [stack,funil,...cards,...txt,...bars,...rows].forEach(el=>{if(el)el.style.transition='none';});

  function finalState(mobileText){
    txt.forEach(el=>{el.style.opacity=mobileText?'1':'';el.style.transform=mobileText?'none':'';});
    cards.forEach(el=>{el.style.opacity='';el.style.transform='';el.style.zIndex='';});
    if(stack)stack.style.opacity='';
    if(funil){funil.style.opacity='1';funil.style.transform='none';}
    rows.forEach(el=>{el.style.opacity='1';el.style.transform='none';});
    bars.forEach(el=>{el.style.transform='scaleX(1)';});
    counts.forEach(c=>{c.n.textContent=c.raw;});
  }

  let lp=-2, ticking=false;
  function update(){
    if(ticking)return; ticking=true;
    requestAnimationFrame(()=>{
      ticking=false;
      if(!deskF.matches){finalState(true);return;}    // mobile: sem pin, funil direto (CSS esconde a stack)
      if(reduceF.matches){finalState(false);return;}
      const vh=innerHeight||document.documentElement.clientHeight;
      const r=track.getBoundingClientRect();
      const len=Math.max(1,track.offsetHeight-vh);
      const p=cl((-r.top)/len);
      if(Math.abs(p-lp)<0.001)return; lp=p;

      // texto + tags: já fixos/visíveis desde o começo (não esperam a rolagem)
      txt.forEach(el=>{el.style.opacity='1';el.style.transform='none';});
      // 1º card fixo desde o início; os outros entram da direita -> esquerda, retos
      cards.forEach((el,i)=>{
        const t = i===0 ? 1 : ease(cl((p-(0.04+(i-1)*0.20))/0.20));
        el.style.opacity='1';   // sólidos, deslizando da borda direita (não aparecem do nada)
        el.style.transform=`translateX(${(i-1)*27 + 5 + (1-t)*760}px)`;
        el.style.zIndex=String(i+1);
      });
      // funil desliza da direita e "engole" os cards, cobrindo-os por completo
      const fp=ease(cl((p-0.5)/0.3));
      if(funil){funil.style.opacity=String(cl(fp*1.5));funil.style.transform=`translateX(${(1-fp)*580}px)`;}
      if(stack)stack.style.opacity='1';   // cards permanecem; o funil entra por cima
      // linhas + barras + números do funil
      rows.forEach((el,i)=>{const t=ease(cl((p-(0.8+i*0.02))/0.12));el.style.opacity=String(t);el.style.transform=`translateY(${(1-t)*12}px)`;});
      const bp=ease(cl((p-0.82)/0.16));
      bars.forEach(el=>{el.style.transform=`scaleX(${bp})`;});
      counts.forEach(c=>{if(c.target)c.n.textContent = bp>=1 ? c.raw : fmt(Math.round(bp*c.target));});
    });
  }
  addEventListener('scroll',update,{passive:true});
  addEventListener('resize',update,{passive:true});
  deskF.addEventListener('change',()=>{lp=-2;update();});
  reduceF.addEventListener('change',()=>{lp=-2;update();});
  addEventListener('load',update);
  update();
})();

/* Seção "dor": cena com pin em duas fases.
   Fase 1 (reveal): rolando, cada card sobe um por vez, da esquerda p/ direita.
   Fase 2 (pile): com todos visíveis, continuar rolando recolhe os cards para a
   direita, empilhados de forma desorganizada (papelada), enquanto a frase
   surge à esquerda. */
const dorScroll=document.querySelector('#dor .dor-scroll');
const dorGrid=document.querySelector('#dor .dor-grid');
if(dorScroll&&dorGrid){
  const cards=[...dorGrid.querySelectorAll('.dor-card')];
  const phrase=document.querySelector('#dor .dor-pile-phrase');
  const ph1=phrase&&phrase.querySelector('.ph1');
  const ph2=phrase&&phrase.querySelector('.ph2');
  // quebra a 2ª frase em letras (espaços viram texto normal, cobertos pelo
  // grifo preto contínuo) para revelar da esquerda p/ direita
  let chars=[];
  if(ph2){
    const nodes=[...ph2.childNodes];
    ph2.textContent='';
    nodes.forEach(node=>{
      if(node.nodeName==='BR'){ph2.appendChild(document.createElement('br'));return;}
      [...node.textContent].forEach(ch=>{
        if(ch===' '){ph2.appendChild(document.createTextNode(' '));}
        else{const cs=document.createElement('span');cs.className='ch';cs.textContent=ch;ph2.appendChild(cs);chars.push(cs);}
      });
    });
  }
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const desktop=matchMedia('(min-width:900px)');
  // deslocamentos fixos (bagunçados) por card, para o visual de papelada
  const jitter=[
    {x: 6,  y:-22, r:-8},
    {x:-16, y: 14, r: 6},
    {x: 22, y: -4, r:-3},
    {x:-10, y: 20, r: 9},
    {x: 14, y:-12, r:-6},
  ];
  const easeInOut=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const clamp01=v=>v<0?0:v>1?1:v;

  const showAll=()=>{
    cards.forEach(c=>{c.classList.add('shown');c.classList.remove('piling');c.style.transform='';c.style.transition='';c.style.zIndex='';});
    if(phrase){phrase.style.opacity='';phrase.style.transform='';}
    if(ph1){ph1.style.opacity='';ph1.style.transform='';}
    if(ph2){ph2.style.opacity='';}
    chars.forEach(s=>s.classList.add('lit'));
  };

  const setReveal=n=>{cards.forEach((c,i)=>c.classList.toggle('shown',i<n));};

  const setPile=q=>{
    const cq=clamp01(q);
    const eq=easeInOut(cq);
    const gw=dorGrid.clientWidth;
    const cw=cards[0].offsetWidth;
    const pileLeft=gw-cw-14;                // pilha encostada à direita
    // os cards terminam de empilhar em ~0.7, sobrando o trecho final p/ as letras
    const gq=clamp01(cq/0.7);
    const stag=0.14, win=1-stag*(cards.length-1);
    cards.forEach((c,i)=>{
      // cada card (da esquerda) começa a recolher antes; efeito esq -> dir
      const cp=easeInOut(clamp01((gq-i*stag)/win));
      const j=jitter[i];
      const txFull=(pileLeft+j.x)-c.offsetLeft;
      const tx=cp*txFull, ty=cp*j.y, rot=cp*j.r;
      if(eq<=0){c.classList.remove('piling');c.style.transform='';c.style.transition='';c.style.zIndex='';}
      else{
        c.classList.add('piling');
        c.style.transition='none';
        c.style.transform=`translate(${tx}px,${ty}px) rotate(${rot}deg)`;
        c.style.zIndex=String(10+i);        // últimos por cima
      }
    });
    if(phrase){
      phrase.style.transition='none';
      phrase.style.opacity='1';
      phrase.style.transform='translateY(-50%)';
      // 1ª frase entra primeiro (fade + leve deslize)
      if(ph1){
        const p1=easeInOut(clamp01((cq-0.10)/0.32));
        ph1.style.transition='none';
        ph1.style.opacity=String(p1);
        ph1.style.transform=`translateX(${(1-p1)*-20}px)`;
      }
      // 2ª frase DEPOIS: o grifo preto surge e as letras brancas são "escritas"
      // progressivamente da esquerda p/ direita
      if(ph2){
        const barOp=easeInOut(clamp01((cq-0.58)/0.12));
        ph2.style.transition='none';
        ph2.style.opacity=String(barOp);
      }
      const lp=clamp01((cq-0.70)/0.28);
      const nlit=Math.round(lp*chars.length);
      chars.forEach((s,i)=>s.classList.toggle('lit', i<nlit));
    }
  };

  const update=()=>{
    if(reduce||!desktop.matches){showAll();return;}
    const vh=innerHeight||document.documentElement.clientHeight;
    const scrolled=(scrollY||pageYOffset)-dorScroll.offsetTop;
    // fase reveal: 1º card aparece cedo; depois um intervalo GRANDE entre cada um
    const firstAt=vh*-0.65, gap=vh*0.34;
    let n = scrolled<firstAt ? 0 : 1+Math.floor((scrolled-firstAt)/gap);
    n=Math.max(0,Math.min(cards.length,n));
    setReveal(n);
    // fase pile: só começa depois do último card + um respiro para ler
    const revealEnd=firstAt+cards.length*gap;
    const holdLen=vh*0.12, pileLen=vh*1.3;
    const q=(scrolled-revealEnd-holdLen)/pileLen;
    setPile(q);
  };

  addEventListener('scroll',update,{passive:true});
  addEventListener('resize',update,{passive:true});
  desktop.addEventListener('change',()=>{showAll();update();});
  update();
}

/* Seção "solução": o título preto escreve, aí um círculo branco cresce de
   baixo REVELANDO a cena do Bob (vídeo + frase) — o vídeo já aparece na hora
   que fica branco; depois a frase "Prazer, esse é o Bob." digita. */
const solStage=document.querySelector('#solucao .sol-dark-stage');
const solScene=document.querySelector('#solucao .sol-scene');
const solTitle=document.querySelector('#solucao .sol-dark-title');
const bobPhrase=document.querySelector('#solucao .bob-intro-title');
if(solStage&&solScene){
  const deskS=matchMedia('(min-width:900px)');
  const redS=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const easeS=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const clS=v=>v<0?0:v>1?1:v;
  // "Agora imagina...": título que escreve letra a letra
  let tchars=[];
  if(solTitle){
    const words=solTitle.textContent.split(' ');
    solTitle.textContent='';
    words.forEach((w,wi)=>{
      const ws=document.createElement('span');ws.className='tw';
      [...w].forEach(ch=>{const cs=document.createElement('span');cs.className='tc';cs.textContent=ch;ws.appendChild(cs);tchars.push(cs);});
      solTitle.appendChild(ws);
      if(wi<words.length-1) solTitle.appendChild(wi===4 ? document.createElement('br') : document.createTextNode(' '));
    });
  }
  // "Prazer, esse é o Bob.": frase da cena, digita depois do vídeo aparecer
  let pchars=[];
  if(bobPhrase){
    const src=[...bobPhrase.childNodes];
    bobPhrase.textContent='';
    (function walk(nodes,bold){
      nodes.forEach(node=>{
        if(node.nodeName==='BR'){bobPhrase.appendChild(document.createElement('br'));return;}
        if(node.nodeType===1){walk([...node.childNodes], bold||node.nodeName==='B'||node.nodeName==='STRONG');return;}
        [...node.textContent].forEach(ch=>{
          if(ch===' '){bobPhrase.appendChild(document.createTextNode(' '));}
          else{const cs=document.createElement('span');cs.className=bold?'tc tcb':'tc';cs.textContent=ch;bobPhrase.appendChild(cs);pchars.push(cs);}
        });
      });
    })(src,false);
  }
  const setClip=r=>{const v=(r==null)?'none':`circle(${r}px at 50% 100%)`;solScene.style.clipPath=v;solScene.style.webkitClipPath=v;};
  const updS=()=>{
    if(redS||!deskS.matches){setClip(null);tchars.forEach(s=>s.classList.add('lit'));pchars.forEach(s=>s.classList.add('typed'));return;}
    const vh=innerHeight||document.documentElement.clientHeight;
    const vw=innerWidth||document.documentElement.clientWidth;
    const scrolled=-solStage.getBoundingClientRect().top;
    const len=Math.max(1,solStage.offsetHeight-vh);
    const t=clS(scrolled/len);
    // 1) escreve "Agora imagina..."
    const nlit=Math.round(clS((t-0.03)/0.27)*tchars.length);
    tchars.forEach((s,i)=>s.classList.toggle('lit', i<nlit));
    // 2) o círculo branco cresce e REVELA o vídeo (Bob aparece já ao virar branco)
    const maxR=Math.hypot(vw/2,vh)+48;
    setClip(easeS(clS((t-0.40)/0.42))*maxR);
    // 3) depois, "Prazer, esse é o Bob." digita
    const ntyped=Math.round(clS((t-0.82)/0.16)*pchars.length);
    pchars.forEach((s,i)=>s.classList.toggle('typed', i<ntyped));
  };
  addEventListener('scroll',updS,{passive:true});
  addEventListener('resize',updS,{passive:true});
  deskS.addEventListener('change',updS);
  updS();
}



/* ===== Pagamentos: cena reativa à rolagem =====
   - box começa na coluna direita (vazio);
   - as linhas "caem" no box (vindas de cima, como do funil), com impacto sutil;
   - com todas dentro, o box desliza p/ a esquerda puxando a entrada do texto (à direita).
   Reversível ao subir. ===== */
(function(){
  const block=document.querySelector('#pagamentos');
  if(!block)return;
  const reduce=matchMedia('(prefers-reduced-motion:reduce)');
  const desk=matchMedia('(min-width:900px)');
  const cl=v=>v<0?0:v>1?1:v;
  const ease=t=>1-Math.pow(1-t,3);
  const back=t=>{const c=2.2;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);}; // easeOutBack (overshoot p/ pouso)
  const txt=[...block.querySelectorAll('.feat-txt .reveal')];
  const ui=block.querySelector('.feat-ui');
  const card=block.querySelector('.pag-card');
  const rows=[...block.querySelectorAll('.pag-row')];
  const bills=[...block.querySelectorAll('.bill')];
  const bubble=block.querySelector('.pag-bubble');
  const stage=block.querySelector('.pag-stage');
  const funnel=document.querySelector('#vendas .funil-slide .ui');  // origem das notas (atrás do funil)
  const BX=[-72,-34,12,52,88];               // espalhamento horizontal das notas
  [ui,card,bubble,...txt,...rows,...bills].forEach(el=>{if(el)el.style.transition='none';});

  function rightShift(){                     // deslocamento p/ a coluna direita = largura do box + gap
    const g=parseFloat(getComputedStyle(block).columnGap)||60;
    return ui.getBoundingClientRect().width + g;
  }

  function apply(p){
    if(!desk.matches){                       // mobile: sem deslocamento lateral
      ui.style.transform='none'; ui.style.opacity='1'; card.style.transform='none';
      rows.forEach((el,i)=>{const t=cl((p-0.06-i*0.12)/0.26);el.style.opacity=cl(t*1.6);el.style.transform=`translateY(${(1-back(t))*-30}px)`;});
      txt.forEach((el,i)=>{const lp=ease(cl((p-0.5-i*0.05)/0.4));el.style.opacity=lp;el.style.transform=`translateY(${(1-lp)*24}px)`;});
      if(bubble){const bp=ease(cl((p-0.8)/0.2));bubble.style.opacity=bp;bubble.style.transform=`translateY(${(1-bp)*10}px)`;}
      block.classList.toggle('lit', p>0.5);
      return;
    }
    const RIGHT=rightShift();
    // ponto de origem das notas = base do box de funil (atrás dele), medido ao vivo
    const sTop=stage.getBoundingClientRect().top;
    const startY=funnel ? (funnel.getBoundingClientRect().bottom - sTop) : -480;   // ~ -517
    const yEnd=128;                                        // até dentro do card (fica atrás dele)
    // Fase 1 — notas de dinheiro saem de trás do funil e caem atrás do box, uma a uma
    let impact=0;
    bills.forEach((el,i)=>{
      const s=0.05+i*0.085, dur=0.22;
      const t=cl((p-s)/dur);
      const fall=ease(t);
      const yy=startY + (yEnd-startY)*fall;
      const op=cl(t/0.06)*(1-cl((t-0.94)/0.06));          // ocultação real fica por conta do funil/box (z-index)
      const rot=(i%2?1:-1)*(15*(1-fall)+5);
      el.style.opacity=op.toFixed(3);
      el.style.transform=`translate(${BX[i]||0}px,${yy.toFixed(1)}px) rotate(${rot.toFixed(1)}deg)`;
      impact+=Math.exp(-Math.pow((p-(s+dur*0.82))/0.028,2));  // impacto quando a nota entra
    });
    // box: segura na direita enquanto recebe, depois desliza p/ a esquerda; squash sutil no impacto
    const slide=ease(cl((p-0.5)/0.28));
    const imp=Math.min(impact,1);
    ui.style.opacity='1';
    ui.style.transform=`translateX(${((1-slide)*RIGHT).toFixed(1)}px)`;
    card.style.transform=`scale(${(1+imp*0.05).toFixed(3)},${(1-imp*0.07).toFixed(3)})`;
    // linhas surgem conforme as notas caem + realce dinâmico progressivo depois que o box vai p/ esquerda
    const gate=1-cl((p-0.985)/0.015);
    rows.forEach((el,i)=>{
      const s=0.05+i*0.085, dur=0.22;
      const land=cl((p-(s+dur*0.62))/0.13);
      const hs=0.8+i*0.045, w=0.085;
      const h=Math.sin(Math.PI*cl((p-hs)/w))*gate;        // pulso de realce, sequencial
      el.style.opacity=land.toFixed(3);
      el.style.transform=`translate(${(h*14).toFixed(1)}px,${((1-land)*9 - h*4).toFixed(1)}px) scale(${(1+h*0.04).toFixed(3)})`;
      el.style.transformOrigin='left center';
      el.style.borderRadius = h>0.03 ? '12px' : '';
      el.style.background = h>0.03 ? `rgba(95,165,124,${(0.09*h).toFixed(3)})` : '';
      el.style.boxShadow = h>0.03 ? `0 10px 26px -8px rgba(95,165,124,${(0.5*h).toFixed(2)})` : '';
    });
    // texto entra da direita conforme o box sai
    txt.forEach((el,i)=>{
      const lp=ease(cl((p-0.55-i*0.05)/0.32));
      el.style.opacity=lp;
      el.style.transform=`translateX(${((1-lp)*44).toFixed(1)}px)`;
    });
    if(bubble){const bp=ease(cl((p-0.82)/0.14));bubble.style.opacity=bp;bubble.style.transform=`translateY(${((1-bp)*12).toFixed(1)}px)`;}
    lit(p>(block.classList.contains('lit')?0.42:0.5));
  }
  function lit(on){block.classList.toggle('lit',on);}

  function finalState(){
    block.classList.add('lit');
    [ui,card,bubble,...txt,...rows].forEach(el=>{if(el){el.style.opacity='';el.style.transform='';}});
    rows.forEach(el=>{el.style.borderRadius='';el.style.background='';el.style.boxShadow='';});
    bills.forEach(el=>{el.style.opacity='0';});           // notas já "entraram"
  }

  let ticking=false, lp=-2;
  function onScroll(){
    if(ticking)return; ticking=true;
    requestAnimationFrame(()=>{
      ticking=false;
      if(reduce.matches){finalState();return;}
      const vh=innerHeight||document.documentElement.clientHeight;
      const r=block.getBoundingClientRect();
      if(r.bottom<-80||r.top>vh+80){const p=r.top>vh?0:1;if(lp!==p){lp=p;apply(p);}return;}
      const p=cl((vh*0.9 - r.top)/(vh*0.9));   // runway maior = cena um pouco mais lenta
      if(Math.abs(p-lp)<0.002)return; lp=p; apply(p);
    });
  }
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',()=>{lp=-2;onScroll();},{passive:true});
  desk.addEventListener('change',()=>{lp=-2;onScroll();});
  reduce.addEventListener('change',onScroll);
  addEventListener('load',onScroll);
  onScroll();
})();


/* ===== Projetos: kanban — cards entram da direita e se encaixam; depois um
   card migra de Criação -> Aprovação (estilo kanban). Reativo à rolagem. ===== */
(function(){
  const block=document.querySelector('#projetos');
  if(!block)return;
  const kan=block.querySelector('.kanban');
  const cardEls=[...kan.querySelectorAll('.kcard')];
  if(!cardEls.length)return;
  const cards={}; cardEls.forEach(el=>cards[el.dataset.c]=el);
  const cCri=block.querySelector('.c-cri'), cApr=block.querySelector('.c-apr');
  const reduce=matchMedia('(prefers-reduced-motion:reduce)');
  const cl=v=>v<0?0:v>1?1:v;
  const ease=t=>1-Math.pow(1-t,3);
  cardEls.forEach(el=>{el.style.transition='none';});
  let L=null;
  function measure(){
    const KW=kan.clientWidth||480;
    const colGap=14, headerH=32, rowGap=12;
    const colW=(KW-colGap)/2, cardW=colW;
    const cardH=Math.round(cardW*0.78);
    cardEls.forEach(el=>{el.style.width=cardW+'px';el.style.height=cardH+'px';});
    kan.style.height=(headerH+2*cardH+rowGap+8)+'px';
    const slot=(c,r)=>({x:c*(colW+colGap), y:headerH + r*(cardH+rowGap)});
    L={slot, flyoff:KW+cardW+60};
  }
  function apply(p){
    if(!L) measure();
    const {slot}=L;
    const mv=ease(cl((p-0.18)/0.5));                    // 0 = posts em Criação; 1 = posts em Aprovação
    cCri.textContent = mv>0.5?'1':'2';
    cApr.textContent = mv>0.5?'2':'1';
    // cards já presentes (sem entrada) — só o de migração se move
    const put=(el,c,r)=>{el.style.opacity='1';el.style.zIndex='1';el.style.transform=`translate(${slot(c,r).x}px,${slot(c,r).y}px)`;};
    put(cards.emb,0,0);                                 // Criação topo
    put(cards.cert,1,0);                                // Aprovação topo
    // posts migra de Criação(0,1) -> Aprovação(1,1) com um arco
    const s0=slot(0,1), s1=slot(1,1);
    const px=s0.x + (s1.x-s0.x)*mv;
    const py=s0.y + (s1.y-s0.y)*mv - Math.sin(mv*Math.PI)*26;
    const sc=1 + Math.sin(mv*Math.PI)*0.06;
    cards.posts.style.opacity='1';
    cards.posts.style.zIndex = (mv>0.02&&mv<0.99)?'5':'1';
    cards.posts.style.transform=`translate(${px.toFixed(1)}px,${py.toFixed(1)}px) scale(${sc.toFixed(3)})`;
  }
  function finalState(){
    if(!L) measure();
    const {slot}=L;
    cCri.textContent='1'; cApr.textContent='2';
    const put=(el,c,r)=>{el.style.opacity='1';el.style.transform=`translate(${slot(c,r).x}px,${slot(c,r).y}px)`;};
    put(cards.emb,0,0); put(cards.cert,1,0); put(cards.posts,1,1);
  }
  let ticking=false, lp=-2;
  function onScroll(){
    if(ticking)return; ticking=true;
    requestAnimationFrame(()=>{
      ticking=false;
      if(reduce.matches){finalState();return;}
      const vh=innerHeight||document.documentElement.clientHeight;
      const box=block.querySelector('.proj-card')||block;   // ancora no BOX (não no bloco inteiro)
      const r=box.getBoundingClientRect();
      if(r.bottom<-80||r.top>vh+120){const p=r.top>vh?0:1;if(lp!==p){lp=p;apply(p);}return;}
      // só começa depois que o box chega e está visível; termina com ele bem enquadrado
      const p=cl((vh*0.52 - r.top)/(vh*0.42));
      if(Math.abs(p-lp)<0.002)return; lp=p; apply(p);
    });
  }
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',()=>{measure();lp=-2;onScroll();},{passive:true});
  reduce.addEventListener('change',onScroll);
  addEventListener('load',()=>{measure();onScroll();});
  measure(); onScroll();
})();


/* ===== Tarefas: cena com PIN =====
   - as tarefas (tokens) caem dos cards de Projetos p/ dentro do box (que começa na direita, vazio);
   - o box desliza p/ a esquerda puxando o texto; e as tarefas são ticadas progressivamente.
   Reversível ao subir. ===== */
(function(){
  const track=document.querySelector('#tarefas');
  if(!track)return;
  const ui=track.querySelector('.feat-ui');
  const stage=track.querySelector('.tar-stage');
  const card=track.querySelector('.tar-card');
  const title=card.querySelector('.ui-title');
  const rows=[...track.querySelectorAll('.tar-row')];
  const tokens=[...track.querySelectorAll('.tar-token')];
  const txt=[...track.querySelectorAll('.feat-txt .reveal')];
  const bubble=track.querySelector('.tar-bubble');
  const projCard=document.querySelector('#projetos .proj-card');   // origem dos tokens
  const reduce=matchMedia('(prefers-reduced-motion:reduce)');
  const desk=matchMedia('(min-width:900px)');
  const cl=v=>v<0?0:v>1?1:v;
  const ease=t=>1-Math.pow(1-t,3);
  const BX=[-96,-48,4,52,98];
  const tickAt=[0.74,0.84];      // linhas 0 e 1 ticadas progressivamente (linha 2 fica aberta)
  [ui,card,title,bubble,...rows,...txt,...tokens].forEach(el=>{if(el)el.style.transition='none';});

  let CENTER=null;
  function measure(){                            // deslocamento inicial: alinha o box à DIREITA, junto do box de Projetos
    const saved=ui.style.transform; ui.style.transform='none';
    const r=card.getBoundingClientRect();        // caixa branca visível (não o container)
    if(projCard){
      const pr=projCard.getBoundingClientRect();
      CENTER = pr.right - r.right;               // borda direita alinhada com o box de Projetos
    } else {
      CENTER = (innerWidth/2)-(r.left+r.width/2);
    }
    ui.style.transform=saved;
  }
  function apply(rectTop){
    const vh=innerHeight||document.documentElement.clientHeight;
    // tp: emissão dos tokens/organização — começa já na transição (Projetos ainda visível)
    const tp=cl((vh*1.10 - rectTop)/(vh*1.10));
    // p: progresso do PIN — título, deslize p/ esquerda, ticar
    const p=cl((-rectTop)/Math.max(1,track.offsetHeight-vh));
    // alinhamento à direita (junto do box de Projetos), calculado ao vivo (auto-corrige layout)
    const applied=new DOMMatrixReadOnly(getComputedStyle(ui).transform).m41;
    const cr=card.getBoundingClientRect();
    const naturalR=cr.right-applied;
    const OFFSET = projCard ? (projCard.getBoundingClientRect().right - naturalR)
                            : (innerWidth/2 - ((cr.left-applied) + cr.width/2));
    const sTop=stage.getBoundingClientRect().top;
    const startY=projCard ? (projCard.getBoundingClientRect().bottom - sTop) : -560;   // sai dos cards de Projetos
    const yEnd=(card.getBoundingClientRect().top - sTop) + 58;
    // tokens caem dos cards de Projetos p/ dentro do box
    tokens.forEach((el,i)=>{
      const s=i*0.09, dur=0.5;
      const t=cl((tp-s)/dur);
      const fall=ease(t);
      const yy=startY + (yEnd-startY)*fall;
      const op=cl(t/0.06)*(1-cl((t-0.88)/0.12));
      const rot=(i%2?1:-1)*(9*(1-fall)+3);
      el.style.opacity=op.toFixed(3);
      el.style.transform=`translate(${(BX[i]||0)}px,${yy.toFixed(1)}px) rotate(${rot.toFixed(1)}deg)`;
    });
    // linhas surgem já durante a entrada (quando o box aparece), sem esperar o pin
    rows.forEach((el,i)=>{
      const land=ease(cl((tp-(0.50+i*0.12))/0.24));
      el.style.opacity=land.toFixed(3);
      el.style.transform=`translateY(${((1-land)*22).toFixed(1)}px)`;
    });
    // box alinhado à direita (junto de Projetos); só depois desliza p/ a esquerda
    const slide=ease(cl((p-0.20)/0.30));
    ui.style.opacity='1';
    ui.style.transform=`translateX(${((1-slide)*OFFSET).toFixed(1)}px)`;
    // título "Tarefas de hoje" já presente, sem animação
    if(title){title.style.opacity='1';title.style.transform='none';}
    // texto entra da direita conforme o box vai p/ a esquerda
    txt.forEach((el,i)=>{
      const lp=ease(cl((p-0.27-i*0.05)/0.28));
      el.style.opacity=lp;
      el.style.transform=`translateX(${((1-lp)*44).toFixed(1)}px)`;
    });
    // ticar progressivo — no fim
    rows.forEach((el,i)=>{ if(i<tickAt.length) el.classList.toggle('ticked', p>tickAt[i]); });
    if(bubble){const bp=ease(cl((p-0.88)/0.10));bubble.style.opacity=bp;bubble.style.transform=`translateY(${((1-bp)*12).toFixed(1)}px)`;}
  }
  function finalState(){
    ui.style.opacity='1'; ui.style.transform='none'; card.style.transform='none';
    if(title){title.style.opacity='1';title.style.transform='none';}
    rows.forEach((el,i)=>{el.style.opacity='1';el.style.transform='none';if(i<tickAt.length)el.classList.add('ticked');});
    txt.forEach(el=>{el.style.opacity='1';el.style.transform='none';});
    tokens.forEach(el=>{el.style.opacity='0';});
    if(bubble){bubble.style.opacity='1';bubble.style.transform='none';}
  }
  let ticking=false, lp=-2;
  function onScroll(){
    if(ticking)return; ticking=true;
    requestAnimationFrame(()=>{
      ticking=false;
      if(!desk.matches||reduce.matches){finalState();return;}
      const rectTop=track.getBoundingClientRect().top;
      if(Math.abs(rectTop-lp)<1)return; lp=rectTop; apply(rectTop);
    });
  }
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',()=>{CENTER=null;lp=-1e9;onScroll();},{passive:true});
  desk.addEventListener('change',()=>{CENTER=null;lp=-1e9;onScroll();});
  reduce.addEventListener('change',onScroll);
  addEventListener('load',()=>{CENTER=null;onScroll();});
  onScroll();
})();


/* ===== Financeiro: cena reativa mais longa — barras sobem e descem (oscilação
   amortecida) enquanto os valores contam; assentam no final. Reversível. ===== */
(function(){
  const block=document.querySelector('#financeiro');
  if(!block)return;
  const ui=block.querySelector('.feat-ui');
  const txt=[...block.querySelectorAll('.feat-txt .reveal')];
  const bars=[...block.querySelectorAll('.pill i')];
  const cols=[...block.querySelectorAll('.pill-col')];
  const strip=block.querySelector('.fin-strip');
  const fmt=v=>v.toLocaleString('pt-BR');
  const counts=[...block.querySelectorAll('[data-count]')].map(n=>{const k=parseInt((n.textContent||'').replace(/\D/g,''),10);return {n, raw:n.textContent.trim(), target:isFinite(k)?k:0};});
  const reduce=matchMedia('(prefers-reduced-motion:reduce)');
  const desk=matchMedia('(min-width:900px)');
  const cl=v=>v<0?0:v>1?1:v;
  const ease=t=>1-Math.pow(1-t,3);
  [ui,strip,...txt,...bars,...cols].forEach(el=>{if(el)el.style.transition='none';});

  function apply(p){
    // sem animação de aparição: box + texto sempre presentes; só as barras/valores animam dentro do box
    txt.forEach(el=>{el.style.opacity='1';el.style.transform='none';});
    if(ui){ui.style.opacity='1';ui.style.transform='none';}
    cols.forEach(el=>{el.style.opacity='1';});
    // barras: crescimento suave e monotônico (só cresce), escalonado por barra
    const main=cl((p-0.08)/0.80);
    const settle=ease(main);
    bars.forEach((el,i)=>{
      const g=ease(cl((p-0.08-i*0.06)/0.66));
      el.style.transform=`scaleY(${g.toFixed(3)})`;
    });
    counts.forEach(c=>{if(!c.target)return;c.n.textContent = settle>=1 ? c.raw : fmt(Math.round(settle*c.target));});
    if(strip){strip.style.opacity='1';strip.style.transform='none';}
  }
  function finalState(){
    txt.forEach(el=>{el.style.opacity='1';el.style.transform='none';});
    if(ui){ui.style.opacity='1';ui.style.transform='none';}
    cols.forEach(el=>el.style.opacity='1');
    bars.forEach(el=>el.style.transform='scaleY(1)');
    counts.forEach(c=>{c.n.textContent=c.raw;});
    if(strip){strip.style.opacity='1';strip.style.transform='none';}
  }
  let ticking=false, lp=-2;
  function onScroll(){
    if(ticking)return; ticking=true;
    requestAnimationFrame(()=>{
      ticking=false;
      if(reduce.matches||!desk.matches){finalState();return;}
      const vh=innerHeight||document.documentElement.clientHeight;
      const r=block.getBoundingClientRect();
      if(r.bottom<-80||r.top>vh+80){const p=r.top>vh?0:1;if(lp!==p){lp=p;apply(p);}return;}
      const p=cl((-r.top)/Math.max(1,block.offsetHeight-vh));   // PIN: anima enquanto fixo
      if(Math.abs(p-lp)<0.0015)return; lp=p; apply(p);
    });
  }
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',()=>{lp=-2;onScroll();},{passive:true});
  desk.addEventListener('change',()=>{lp=-2;onScroll();});
  reduce.addEventListener('change',onScroll);
  addEventListener('load',onScroll);
  onScroll();
})();


/* ===== Agenda: box vira verticalmente (como um calendário); logo em seguida os
   dias pipocam e os eventos entram. Reversível à rolagem. ===== */
(function(){
  const block=document.querySelector('#agenda');
  if(!block)return;
  const ui=block.querySelector('.feat-ui');
  const box=block.querySelector('.ui');
  const txt=[...block.querySelectorAll('.feat-txt .reveal')];
  const days=[...block.querySelectorAll('.cal i')];
  const events=[...block.querySelectorAll('.ag-item')];
  const reduce=matchMedia('(prefers-reduced-motion:reduce)');
  const desk=matchMedia('(min-width:900px)');
  const cl=v=>v<0?0:v>1?1:v;
  const ease=t=>1-Math.pow(1-t,3);
  const N=Math.max(1,days.length);
  [ui,box,...txt,...days,...events].forEach(el=>{if(el)el.style.transition='none';});

  function apply(rectTop){
    const vh=innerHeight||document.documentElement.clientHeight;
    const ep=cl((vh*1.0 - rectTop)/(vh*1.0));                       // entrada: flip + dias
    const p=cl((-rectTop)/Math.max(1,block.offsetHeight-vh));       // pin: eventos do dia
    const d=desk.matches;
    txt.forEach((el,i)=>{const lp=ease(cl((ep-i*0.05)/0.32));el.style.opacity=lp;el.style.transform=d?`translateX(${((1-lp)*-34).toFixed(1)}px)`:`translateY(${((1-lp)*26).toFixed(1)}px)`;});
    if(ui)ui.style.opacity=ease(cl(ep/0.2)).toFixed(3);
    // FLIP vertical do box (como calendário virando de cima p/ baixo)
    const flip=ease(cl((ep-0.10)/0.34));
    if(box)box.style.transform=`rotateX(${(-90*(1-flip)).toFixed(1)}deg)`;
    // dias pipocam logo depois do flip
    days.forEach((el,i)=>{
      const lp=ease(cl((ep-(0.48+(i/N)*0.28))/0.13));
      el.style.opacity=lp.toFixed(3);
      el.style.transform=`scale(${(0.35+0.65*lp).toFixed(3)})`;
    });
    // eventos do dia entram só DEPOIS que a página fixa (pin), um a um
    events.forEach((el,i)=>{
      const lp=ease(cl((p-(0.14+i*0.18))/0.30));
      el.style.opacity=lp.toFixed(3);
      el.style.transform=`translateX(${((1-lp)*26).toFixed(1)}px)`;
    });
  }
  function finalState(){
    txt.forEach(el=>{el.style.opacity='1';el.style.transform='none';});
    if(ui)ui.style.opacity='1';
    if(box)box.style.transform='none';
    days.forEach(el=>{el.style.opacity='1';el.style.transform='none';});
    events.forEach(el=>{el.style.opacity='1';el.style.transform='none';});
  }
  let ticking=false, lp=-1e9;
  function onScroll(){
    if(ticking)return; ticking=true;
    requestAnimationFrame(()=>{
      ticking=false;
      if(!desk.matches||reduce.matches){finalState();return;}
      const rectTop=block.getBoundingClientRect().top;
      if(Math.abs(rectTop-lp)<1)return; lp=rectTop; apply(rectTop);
    });
  }
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',()=>{lp=-1e9;onScroll();},{passive:true});
  desk.addEventListener('change',()=>{lp=-1e9;onScroll();});
  reduce.addEventListener('change',onScroll);
  addEventListener('load',onScroll);
  onScroll();
})();


/* ===== Clientes: cena com PIN — o box fixa e a rolagem move só a lista de clientes
   (como se tivessem vários). Reversível ao subir. ===== */
(function(){
  const track=document.querySelector('#clientes');
  if(!track)return;
  const list=track.querySelector('.cli-list');
  const viewport=track.querySelector('.cli-viewport');
  const ui=track.querySelector('.feat-ui');
  const txt=[...track.querySelectorAll('.feat-txt .reveal')];
  const reduce=matchMedia('(prefers-reduced-motion:reduce)');
  const desk=matchMedia('(min-width:900px)');
  const cl=v=>v<0?0:v>1?1:v;
  const ease=t=>1-Math.pow(1-t,3);
  [list,ui,...txt].forEach(el=>{if(el)el.style.transition='none';});

  function apply(p){
    // sem animação de aparição: texto + box sempre presentes; só a lista rola dentro do box
    txt.forEach(el=>{el.style.opacity='1';el.style.transform='none';});
    if(ui)ui.style.opacity='1';
    const sp=ease(cl((p-0.06)/0.86));
    const max=Math.max(0, list.scrollHeight - viewport.clientHeight);
    list.style.transform=`translateY(${(-sp*max).toFixed(1)}px)`;
  }
  function finalState(){
    txt.forEach(el=>{el.style.opacity='1';el.style.transform='none';});
    if(ui)ui.style.opacity='1';
    list.style.transform='none';
  }
  let ticking=false, lp=-2;
  function onScroll(){
    if(ticking)return; ticking=true;
    requestAnimationFrame(()=>{
      ticking=false;
      const vh=innerHeight||document.documentElement.clientHeight;
      if(!desk.matches||reduce.matches){finalState();return;}
      const rect=track.getBoundingClientRect();
      const len=Math.max(1, track.offsetHeight - vh);
      const p=cl((-rect.top)/len);
      if(Math.abs(p-lp)<0.0012)return; lp=p; apply(p);
    });
  }
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',()=>{lp=-2;onScroll();},{passive:true});
  desk.addEventListener('change',()=>{lp=-2;onScroll();});
  reduce.addEventListener('change',onScroll);
  addEventListener('load',onScroll);
  onScroll();
})();





/* ===== Pro-lead: título com efeito de máquina de escrever controlado pela rolagem.
   ESCREVE letra a letra na entrada e APAGA letra a letra na saída. Layout estável
   (cada char reserva seu espaço via visibility), sem reflow. Reversível. ===== */
(function(){
  const el=document.querySelector('.pro-lead');
  if(!el)return;
  const h=el.querySelector('.pl-flip');
  if(!h)return;
  const reduce=matchMedia('(prefers-reduced-motion:reduce)');
  const cl=v=>v<0?0:v>1?1:v;
  // quebra o texto em palavras (sem quebra interna) e cada letra num <span>
  const chars=[];
  const raw=h.textContent;
  h.textContent='';
  raw.split(/(\s+)/).forEach(tok=>{
    if(tok===''){return;}
    if(/^\s+$/.test(tok)){h.appendChild(document.createTextNode(tok));return;}
    const w=document.createElement('span'); w.className='pl-word';
    [...tok].forEach(c=>{
      const s=document.createElement('span'); s.className='pl-ch'; s.textContent=c;
      w.appendChild(s); chars.push(s);
    });
    h.appendChild(w);
  });
  const total=chars.length;
  let shownN=-1, cursorI=-1;
  function setN(n){
    n=Math.max(0,Math.min(total,n));
    if(n!==shownN){
      for(let i=0;i<total;i++){const on=i<n; if(chars[i].classList.contains('on')!==on)chars[i].classList.toggle('on',on);}
      shownN=n;
    }
    const ci=n>0?n-1:-1;                         // cursor na última letra escrita
    if(ci!==cursorI){
      if(cursorI>=0&&chars[cursorI])chars[cursorI].classList.remove('cursor');
      if(ci>=0&&chars[ci])chars[ci].classList.add('cursor');
      cursorI=ci;
    }
  }
  function apply(){
    const vh=innerHeight||document.documentElement.clientHeight;
    const r=el.getBoundingClientRect();
    const c=(r.top+r.height/2)/vh;                // 1 = centro no fundo; 0 = centro no topo
    const frac=cl((0.92-c)/0.34);                 // escreve: 0 embaixo -> 1 chegando ao centro
    setN(Math.round(frac*total));                 // sem animação de saída: fica escrito ao sair
  }
  function finalState(){setN(total);}
  let ticking=false;
  function onScroll(){
    if(ticking)return; ticking=true;
    requestAnimationFrame(()=>{ticking=false; if(reduce.matches){finalState();return;} apply();});
  }
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',onScroll,{passive:true});
  reduce.addEventListener('change',onScroll);
  addEventListener('load',onScroll);
  onScroll();
})();


/* ===== Foto (intro do app): transição suave da seção de features -> foto.
   Parallax na foto (profundidade) + o degradê cinza do topo recua conforme entra,
   revelando o céu de forma fluida. Reversível à rolagem. ===== */
(function(){
  const sec=document.querySelector('.photo-intro');
  if(!sec)return;
  const bg=sec.querySelector('.pi-bg');
  const fadeTop=sec.querySelector('.pi-fade-top');
  const reduce=matchMedia('(prefers-reduced-motion:reduce)');
  const cl=v=>v<0?0:v>1?1:v;
  const ease=t=>1-Math.pow(1-t,3);
  function apply(){
    const vh=innerHeight||document.documentElement.clientHeight;
    const r=sec.getBoundingClientRect();
    // t: seção cruzando a viewport (0 = topo no fundo da tela; 1 = base no topo da tela)
    const t=cl((vh - r.top)/(vh + r.height));
    // parallax: a foto sobe mais devagar que a página (profundidade),
    // mantendo o degradê cinza do topo intacto para um blend suave com as features
    const par=(t-0.5)*vh*0.10;
    // entrada suave (fade) + zoom-in LEVE e contínuo conforme a rolagem
    const enter=ease(cl((vh - r.top)/(vh*0.80)));
    const sc=(1.10+0.26*t).toFixed(3);                  // zoom-in mais intenso (1.10 -> 1.36) ao rolar
    if(bg){
      bg.style.transform=`translateY(${par.toFixed(1)}px) scale(${sc})`;
      bg.style.opacity=(0.4+0.6*enter).toFixed(3);      // surge do céu azul de fundo
    }
  }
  function finalState(){if(bg){bg.style.transform='scale(1.30)';bg.style.opacity='1';}}
  let ticking=false;
  function onScroll(){
    if(ticking)return; ticking=true;
    requestAnimationFrame(()=>{ticking=false; if(reduce.matches){finalState();return;} apply();});
  }
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',onScroll,{passive:true});
  reduce.addEventListener('change',onScroll);
  addEventListener('load',onScroll);
  onScroll();
})();


/* ===== Bob Pro: cena com PIN — a grade fica fixa e cada card sobe UM POR VEZ,
   com intervalo de rolagem entre eles; ao assentar, o ícone dá um "pop" sutil.
   Reversível à rolagem. ===== */
(function(){
  const track=document.querySelector('.pro-feats-pin');
  if(!track)return;
  const cards=[...track.querySelectorAll('.pro-feat')];
  if(!cards.length)return;
  const icons=cards.map(c=>c.querySelector('.pf-ic'));
  const settled=cards.map(()=>false);
  const reduce=matchMedia('(prefers-reduced-motion:reduce)');
  const desk=matchMedia('(min-width:900px)');
  const cl=v=>v<0?0:v>1?1:v;
  const ease=t=>1-Math.pow(1-t,3);
  const LEAD=0.02, SLOT=0.215, RISE=0.10;              // janelas por card (dentro do pin)
  function pop(i){                                      // dispara o keyframe uma vez (re-disparável)
    const ic=icons[i]; if(!ic)return;
    ic.classList.remove('pf-pop'); void ic.offsetWidth; ic.classList.add('pf-pop');
  }
  function apply(p){
    cards.forEach((c,i)=>{
      const s=LEAD+i*SLOT;
      const rp=ease(cl((p-s)/RISE));
      if(rp>=1){ c.style.opacity=''; c.style.transform=''; c.classList.add('up'); }
      else{ c.classList.remove('up'); c.style.opacity=rp.toFixed(3); c.style.transform=`translateY(${((1-rp)*64).toFixed(1)}px)`; }
      const done = p >= s+RISE;                         // card assentado -> pop no ícone
      if(done && !settled[i]){ settled[i]=true; pop(i); }
      else if(!done && settled[i]){ settled[i]=false; if(icons[i])icons[i].classList.remove('pf-pop'); }
    });
  }
  function finalState(){
    cards.forEach((c,i)=>{c.style.opacity='';c.style.transform='';c.classList.add('up');if(icons[i])icons[i].classList.remove('pf-pop');settled[i]=true;});
  }
  let ticking=false, lp=-2;
  function onScroll(){
    if(ticking)return; ticking=true;
    requestAnimationFrame(()=>{
      ticking=false;
      if(!desk.matches||reduce.matches){finalState();return;}
      const vh=innerHeight||document.documentElement.clientHeight;
      const p=cl((-track.getBoundingClientRect().top)/Math.max(1,track.offsetHeight-vh));
      if(Math.abs(p-lp)<0.001)return; lp=p; apply(p);
    });
  }
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',()=>{lp=-2;onScroll();},{passive:true});
  desk.addEventListener('change',()=>{lp=-2;onScroll();});
  reduce.addEventListener('change',onScroll);
  addEventListener('load',onScroll);
  onScroll();
})();


/* ===== Planos: cards com tilt 3D seguindo o mouse (hover interativo). Só com
   mouse (pointer:fine) e sem prefers-reduced-motion. ===== */
(function(){
  if(!matchMedia('(pointer:fine)').matches) return;
  if(matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const cards=[...document.querySelectorAll('.planos-grid .plan')];
  if(!cards.length) return;
  const MAX=7;
  cards.forEach(card=>{
    const glare=document.createElement('div'); glare.className='plan-glare'; card.appendChild(glare);
    let raf=0, cx=0, cy=0;
    function draw(){
      raf=0;
      card.style.transform=`rotateX(${(-cy*MAX).toFixed(2)}deg) rotateY(${(cx*MAX).toFixed(2)}deg) translateY(-6px) scale(1.02)`;
      glare.style.setProperty('--gx',((cx+0.5)*100).toFixed(1)+'%');
      glare.style.setProperty('--gy',((cy+0.5)*100).toFixed(1)+'%');
    }
    card.addEventListener('mouseenter',()=>{card.classList.add('tilting');card.style.transition='transform .08s ease-out';});
    card.addEventListener('mousemove',e=>{
      const r=card.getBoundingClientRect();
      cx=(e.clientX-r.left)/r.width-0.5;
      cy=(e.clientY-r.top)/r.height-0.5;
      if(!raf) raf=requestAnimationFrame(draw);
    });
    card.addEventListener('mouseleave',()=>{
      card.classList.remove('tilting');
      card.style.transition='transform .5s var(--ease),box-shadow .45s var(--ease)';
      card.style.transform='';
      if(raf){cancelAnimationFrame(raf);raf=0;}
    });
  });
})();


/* ===== Bob Pro: carrossel de dashboards — duplica o conteúdo de cada linha
   para o loop horizontal (-50%) ficar contínuo/sem emenda. ===== */
(function(){
  const tracks=[...document.querySelectorAll('.pro-dash .mq-track, .pro-lightband .mq-track')];
  if(!tracks.length)return;
  tracks.forEach(track=>{
    const originals=[...track.children];
    if(!originals.length)return;
    const row=track.parentElement;
    let guard=0;
    // clona o conjunto até a "metade" exceder a largura da linha
    while(track.scrollWidth < row.clientWidth + 240 && guard<14){
      originals.forEach(n=>track.appendChild(n.cloneNode(true))); guard++;
    }
    // duplica tudo mais uma vez → o keyframe -50% fecha o ciclo sem salto
    [...track.children].forEach(n=>track.appendChild(n.cloneNode(true)));
  });
})();


/* ===== Planos: toggle Mensal/Anual — alterna os preços exibidos e desliza o
   thumb do switch. Estado via classe .is-anual na grade e no toggle. ===== */
(function(){
  const grid=document.querySelector('.planos-grid');
  const toggle=document.querySelector('.plan-toggle');
  if(!grid||!toggle) return;
  const opts=[...toggle.querySelectorAll('.pt-opt')];
  function set(period){
    const anual=period==='anual';
    grid.classList.toggle('is-anual',anual);
    toggle.classList.toggle('is-anual',anual);
    opts.forEach(o=>{const on=o.dataset.period===period;o.classList.toggle('is-active',on);o.setAttribute('aria-selected',on);});
  }
  opts.forEach(o=>o.addEventListener('click',()=>set(o.dataset.period)));
  set('mensal');
})();


/* ===== "Como funciona": rola até o momento exato do "Prazer! Sou o Bob"
   (frame revelado no fim do pin de #solucao), em vez de cair no início da cena. ===== */
(function(){
  const stage=document.querySelector('#solucao .sol-dark-stage');
  if(!stage) return;
  const deskS=matchMedia('(min-width:900px)');
  const links=[...document.querySelectorAll('a[href="#solucao"]')];   // nav + rodapé
  const K=0.985;                                                       // "Prazer!" completo (t≈0.98)
  function targetY(){
    const vh=innerHeight||document.documentElement.clientHeight;
    const absTop=stage.getBoundingClientRect().top+window.scrollY;
    const len=Math.max(1,stage.offsetHeight-vh);
    return absTop+len*K;
  }
  links.forEach(a=>a.addEventListener('click',e=>{
    if(!deskS.matches) return;          // mobile: cena já mostra o estado final; jump padrão
    e.preventDefault();
    scrollTo({top:targetY(),behavior:'smooth'});
  }));
})();
