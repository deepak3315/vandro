import { Link } from '@tanstack/react-router';
import { ArrowUpRight, UsersRound, GraduationCap, TrendingUp, Cloud } from 'lucide-react';
import { services } from '@/lib/site-content';
const icons = [UsersRound, GraduationCap, TrendingUp, Cloud];
export function ServicesGrid() { return <div className="services-grid">{services.map((s, i) => {const Icon = icons[i] ?? Cloud; return <Link to="/services" hash={s.id} className={`service-card service-${s.id}`} key={s.id}><div className="service-top"><Icon size={30} strokeWidth={1.3}/><span>{s.number}</span></div><h3>{s.title}</h3><p>{s.description}</p><div className="service-link">Explore service <ArrowUpRight size={19}/></div></Link>})}</div> }
