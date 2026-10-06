import { createFileRoute } from '@tanstack/react-router';
import { SiteLayout, PageIntro, ConnectBand } from '@/components/site/layout';
import { pageHead, articles } from '@/lib/site-content';
import team from '@/assets/team.jpg';
import cloud from '@/assets/cloud.jpg';
export const Route = createFileRoute('/resources')({head:()=>pageHead('Resources & Insights','Perspectives from VANDRO on career growth, technology skills, and cloud strategy.'),component:Resources});
function Resources(){return <SiteLayout><PageIntro label="RESOURCES & INSIGHTS" title="Ideas for what comes next." description="Practical perspectives on people, careers, and technology."/><section className="shell resource-list">{articles.map((a,i)=><article id={`article-${i}`} key={a.title} className="resource-article"><img src={a.image==='team'?team:cloud} alt={a.image==='team'?'Team discussing a technology project':'Cloud server infrastructure'} width={1536} height={1024} loading="lazy"/><div><span className="eyebrow">{a.category}</span><h2>{a.title}</h2><p>{a.summary}</p><details><summary>Read the perspective <span>+</span></summary><div className="article-body">{a.body.map(p=><p key={p}>{p}</p>)}</div></details></div></article>)}</section><ConnectBand/></SiteLayout>}
