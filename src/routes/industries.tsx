import { createFileRoute } from '@tanstack/react-router';
import { Cpu, HeartPulse, Landmark, ShoppingBag, BookOpen, Factory } from 'lucide-react';
import { SiteLayout, PageIntro, ConnectBand } from '@/components/site/layout';
import { pageHead, industries } from '@/lib/site-content';
const icons=[Cpu,HeartPulse,Landmark,ShoppingBag,BookOpen,Factory];
export const Route = createFileRoute('/industries')({head:()=>pageHead('Industries We Serve','VANDRO supports technology, healthcare, finance, retail, education, and manufacturing with talent and technology solutions.'),component:Industries});
function Industries(){return <SiteLayout><PageIntro label="INDUSTRIES WE SERVE" title="Your industry. Our focus." description="Every sector has its own challenges. We bring a considered approach to yours."/><section className="shell industry-details">{industries.map((x,i)=>{const Icon=icons[i]??Cpu;return <div key={x.title}><Icon size={34} strokeWidth={1.3}/><span>0{i+1}</span><h2>{x.title}</h2><p>{x.description}</p></div>})}</section><ConnectBand/></SiteLayout>}
