import React from 'react';
import { ARCH } from './architecture';
import { PROPOSAL } from './improvements';

export function SpacePlan({improvements}:{improvements:boolean}){
 const px=(x:number)=>15+(x+3)*35,pz=(z:number)=>30+(z+3)*33.333;
 return <figure className="space-plan"><svg viewBox="0 0 240 258" role="img" aria-label="二层平面：大佛侧为挑空，临空一排四根柱子，柱后为静坐区和入口侧通路">
  <rect x="15" y="30" width="210" height="200" fill="#efeee9" stroke="#b9b7b0"/>
  <rect x="46" y="37" width="148" height="126" fill="#ffffff" stroke="#a3a19a" strokeDasharray="3 4"/>
  <text x="120" y="91" textAnchor="middle" fill="#686761">挑空至一层</text>
  <circle cx="120" cy={pz(ARCH.rainZ)} r="7" fill="none" stroke="#686761"/>
  <text x="120" y="126" textAnchor="middle" fontSize="10" fill="#686761">雨链与接雨瓶</text>
  <rect x="46" y="27" width="148" height="9" fill="#c6c9c1"/><text x="120" y="17" textAnchor="middle" fill="#1c1c1a">通高大佛</text>
  <rect x="15" y={pz(1)} width="210" height={pz(3)-pz(1)} fill="#e3e1db"/>
  {[-1,1].map(side=><g key={side}>{Array.from({length:16},(_,i)=><line key={i} x1={side<0?16:195} x2={side<0?45:224} y1={31+i*8.25} y2={31+i*8.25} stroke="#c9c7c0"/>)}<path d={side<0?'M30 55V145L26 139M30 145L34 139':'M210 55V145L206 139M210 145L214 139'} fill="none" stroke="#8a8882"/></g>)}
  {improvements&&<><line x1="47" x2="193" y1={pz(1.015)} y2={pz(1.015)} stroke="#a12b2b" strokeWidth="2"/><rect x="16" y={pz(2.2)} width="208" height="24" fill="#d6d4cd"/><text x="120" y="222" textAnchor="middle" fontSize="10" fill="#686761">两侧楼梯相通的通行带</text></>}
  {ARCH.columns.map((c,i)=><circle key={i} cx={px(c.x)} cy={pz(c.z)} r="8.75" fill="#ffffff" stroke="#6b6a64"/>)}
  {ARCH.seats.map((c,i)=><ellipse key={i} cx={px(c.x)} cy={pz(improvements?PROPOSAL.seatZ:c.z)} rx="7" ry="5" fill="#8a8478"/>)}
  <text x="120" y="248" textAnchor="middle" fill="#a12b2b">心经墙 · 入口侧</text>
 </svg><figcaption>佛侧挑空，柱后静坐；二层只占入口一侧。</figcaption></figure>
}

