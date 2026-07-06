import { useParams, Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SERVICES, BUSINESS } from "@/lib/siteContent";
import { ArrowUpRight, Check } from "lucide-react";
import { useSiteImages } from "@/hooks/useSiteImages";
import SEOHead from "@/components/SEOHead";

const ServicePage = () => {
  const { service: slug } = useParams<{ service: string }>();
  const service = SERVICES.find((s) => s.slug === slug);
  const { getImage } = useSiteImages();

  if (!service) return <Navigate to="/services" replace />;

  const serviceImage = getImage(`service.${service.slug}`, service.image);
  const related = SERVICES.filter((s) => s.slug !== slug).slice(0, 3);
  const idx = SERVICES.findIndex(s => s.slug === slug);
  const number = String(idx + 1).padStart(2, "0");

  return (
    <>
      <SEOHead
        title={service.metaTitle}
        description={service.metaDescription}
        canonical={`/services/${service.slug}`}
        image={service.image}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: service.name,
            description: service.longDesc,
            provider: { "@type": "HairSalon", name: BUSINESS.name, telephone: BUSINESS.phone },
          }),
        }}
      />

      {/* Masthead */}
      <section className="border-t border-border">
        <div className="container">
          <div className="flex flex-wrap items-center justify-between gap-2 py-4 text-[11px] uppercase tracking-[0.22em] text-muted-foreground border-b border-border">
            <Link to="/services" className="hover:text-primary transition-colors">← The Index</Link>
            <span>№ {number} · {service.name}</span>
            <Link to="/book" className="hover:text-primary transition-colors">Reserve</Link>
          </div>

          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 py-12 lg:py-20 items-center">
            <div className="lg:col-span-6 space-y-8 animate-rise">
              <p className="eyebrow">Service № {number}</p>
              <h1 className="display-xl">{service.name}.</h1>
              <p className="pull-quote text-foreground/80 max-w-xl">"{service.shortDesc}"</p>
              <div className="flex flex-wrap items-center gap-6 pt-2">
                <Link to="/book">
                  <Button size="lg" className="rounded-none h-12 px-8 text-[11px] uppercase tracking-[0.22em]">
                    Book this service
                  </Button>
                </Link>
                <a href={BUSINESS.phoneHref} className="marker-link">{BUSINESS.phone}</a>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="aspect-[4/5] w-full overflow-hidden bg-muted">
                <img src={serviceImage} alt={service.name} className="w-full h-full object-cover" />
              </div>
              <p className="image-caption mt-3">Fig. {number} — {service.name}, photographed in available light.</p>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="border-t border-border section-y">
        <div className="container grid lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="lg:col-span-4">
            <p className="eyebrow mb-3">On the work</p>
            <h2 className="display-md">In our own words.</h2>
          </div>
          <div className="lg:col-span-7 lg:col-start-6 space-y-6">
            <p className="text-base md:text-lg leading-relaxed text-muted-foreground">{service.longDesc}</p>
            {service.durationMinutes && (
              <p className="eyebrow">Typical duration · {service.durationMinutes >= 60 ? `${Math.floor(service.durationMinutes/60)}h${service.durationMinutes%60 ? ` ${service.durationMinutes%60}m` : ''}` : `${service.durationMinutes}m`}</p>
            )}
          </div>
        </div>
      </section>

      {/* Included */}
      <section className="border-t border-border section-y">
        <div className="container">
          <div className="grid lg:grid-cols-12 gap-10 mb-10">
            <div className="lg:col-span-4">
              <p className="eyebrow mb-3">The Inclusions</p>
              <h2 className="display-md">What's part of it.</h2>
            </div>
          </div>
          <ul className="border-t border-foreground/80">
            {service.included.map((item, i) => (
              <li key={item} className="border-b border-border grid grid-cols-12 items-center gap-4 py-6 px-2 -mx-2">
                <span className="col-span-1 eyebrow text-foreground/60">№ {String(i+1).padStart(2, '0')}</span>
                <span className="col-span-10 font-display text-xl md:text-2xl" style={{ fontVariationSettings: '"opsz" 96' }}>{item}</span>
                <Check className="col-span-1 h-5 w-5 text-primary justify-self-end" />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Related */}
      <section className="border-t border-border section-y bg-muted/40">
        <div className="container">
          <div className="grid lg:grid-cols-12 gap-10 mb-10">
            <div className="lg:col-span-4">
              <p className="eyebrow mb-3">Continue reading</p>
              <h2 className="display-md">Other services.</h2>
            </div>
            <div className="lg:col-span-7 lg:col-start-6 self-end">
              <Link to="/services" className="marker-link">All services</Link>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {related.map(s => (
              <Link key={s.slug} to={`/services/${s.slug}`} className="group block">
                <div className="aspect-[4/5] bg-muted overflow-hidden mb-4">
                  <img src={getImage(`service.${s.slug}`, s.image)} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                </div>
                <p className="eyebrow text-foreground/60 mb-1">Service</p>
                <h3 className="font-display text-2xl group-hover:text-primary transition-colors">{s.name}</h3>
                <p className="text-sm text-muted-foreground mt-2">{s.shortDesc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border section-y">
        <div className="container max-w-4xl text-center space-y-8">
          <p className="eyebrow">Reservations</p>
          <h2 className="display-lg">
            Ready for {service.name.toLowerCase()}?<br/>
            <Link to="/book" className="inline-flex items-center gap-3 underline decoration-2 underline-offset-8 decoration-primary hover:text-primary transition-colors">
              Book a chair <ArrowUpRight className="h-7 w-7" />
            </Link>
          </h2>
        </div>
      </section>
    </>
  );
};

export default ServicePage;
