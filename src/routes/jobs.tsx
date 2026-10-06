import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowUpRight, Search } from 'lucide-react';
import { SiteLayout, PageIntro } from '@/components/site/layout';
import { Button } from '@/components/ui/button';
import { pageHead } from '@/lib/site-content';
export const Route = createFileRoute('/jobs')({head:()=>pageHead('Careers & Opportunities','Explore your next chapter with VANDRO. Career guidance, practical training, and technology opportunities.'),component:Careers});
function Careers(){return <SiteLayout><PageIntro label="CAREERS & OPPORTUNITIES" title="Your potential. A world of possibility." description="Take a considered next step in your technology career."/><section className="shell careers-content"><div className="vacancies"><Search size={32} strokeWidth={1.3}/><h2>New opportunities are on the horizon.</h2><p>There are no published vacancies at the moment. Check back for future openings.</p></div><div className="career-next"><h2>Make your next move count.</h2><p>Develop your skills, sharpen your profile, and prepare for the opportunities ahead.</p><Button asChild variant="outline"><Link to="/services" hash="career">Explore career support <ArrowUpRight/></Link></Button></div></section></SiteLayout>}
