import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { vyahaLogos } from '../assets/logos';
import './Home.css';

const STORE_BADGE =
  'https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return reduced;
}

function useReveal(reducedMotion) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (reducedMotion) {
      node.classList.add('is-revealed');
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add('is-revealed');
          observer.disconnect();
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [reducedMotion]);

  return ref;
}

function Home() {
  const reducedMotion = usePrefersReducedMotion();
  const heroRef = useRef(null);
  const promiseRef = useReveal(reducedMotion);
  const appsRef = useReveal(reducedMotion);
  const valueRef = useReveal(reducedMotion);
  const launchRef = useReveal(reducedMotion);

  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [scrollHint, setScrollHint] = useState(true);

  useEffect(() => {
    if (reducedMotion) return undefined;

    const onScroll = () => {
      const y = window.scrollY;
      setScrollHint(y < 40);

      const hero = heroRef.current;
      if (hero) {
        const progress = Math.min(y / Math.max(window.innerHeight, 1), 1);
        hero.style.setProperty('--hero-depth', String(progress));
      }
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return undefined;

    const onMove = (event) => {
      const nx = (event.clientX / window.innerWidth - 0.5) * 2;
      const ny = (event.clientY / window.innerHeight - 0.5) * 2;
      setTilt({ x: nx, y: ny });
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reducedMotion]);

  const parallaxStyle = {
    '--tilt-x': String(tilt.x),
    '--tilt-y': String(tilt.y),
  };

  return (
    <div className="home" style={parallaxStyle}>
      <section className="home-hero" ref={heroRef} aria-label="Vyaha home">
        <div className="home-hero__media" aria-hidden="true">
          <div className="home-hero__kenburns">
            <img src="/vyaha-food-hero.png" alt="" />
          </div>
          <div className="home-hero__grain" />
          <div className="home-hero__vignette" />
          <div className="home-hero__orb home-hero__orb--red" />
          <div className="home-hero__orb home-hero__orb--blue" />
          <div className="home-hero__orb home-hero__orb--green" />
        </div>

        <div className="home-hero__content">
          <div
            className={`home-hero__logo-stage${reducedMotion ? ' is-static' : ''}`}
            style={{
              transform: reducedMotion
                ? undefined
                : `translate3d(${tilt.x * -12}px, ${tilt.y * -10}px, 0)`,
            }}
          >
            <svg
              className="home-hero__write"
              viewBox="0 0 420 120"
              aria-hidden="true"
            >
              <path
                className="home-hero__stroke home-hero__stroke--red"
                d="M36 70 C 70 34, 96 30, 118 58 C 138 84, 158 80, 182 50"
              />
              <path
                className="home-hero__stroke home-hero__stroke--blue"
                d="M120 86 C 168 98, 220 92, 268 66 C 296 50, 320 44, 352 52"
              />
              <path
                className="home-hero__stroke home-hero__stroke--green"
                d="M210 64 C 246 28, 286 26, 318 54 C 340 74, 362 70, 388 48"
              />
            </svg>
            <img className="home-hero__logo" src={vyahaLogos.hero} alt="Vyaha" />
            <span className="home-hero__pen" aria-hidden="true" />
          </div>
          <h1 className="home-hero__title">
            <span className="home-hero__word home-hero__word--red">
              <span className="home-hero__word-text">We</span>
              <svg className="home-hero__swash" viewBox="0 0 120 36" aria-hidden="true">
                <path d="M8 28 C 28 8, 52 6, 72 18 C 88 28, 100 24, 112 12" />
              </svg>
            </span>{' '}
            <span className="home-hero__word home-hero__word--blue">
              <span className="home-hero__word-text">value</span>
              <svg className="home-hero__swash" viewBox="0 0 180 40" aria-hidden="true">
                <path d="M6 30 C 40 38, 84 34, 118 22 C 140 14, 158 12, 174 18" />
              </svg>
            </span>{' '}
            <span className="home-hero__word home-hero__word--green">
              <span className="home-hero__word-text">your</span>
              <svg className="home-hero__swash" viewBox="0 0 150 40" aria-hidden="true">
                <path d="M10 12 C 36 4, 70 4, 98 18 C 118 28, 134 26, 144 16" />
              </svg>
            </span>{' '}
            <span className="home-hero__word home-hero__word--mix">
              <span className="home-hero__word-text">money.</span>
              <svg className="home-hero__swash home-hero__swash--mix" viewBox="0 0 220 44" aria-hidden="true">
                <path d="M8 30 C 48 40, 96 38, 140 22 C 168 12, 192 10, 212 18" />
              </svg>
            </span>
          </h1>
          <p className="home-hero__lede">
            Genuine menu prices. Hyperlocal food delivery to our home.
          </p>
          <div className="home-hero__ctas">
            <Link to="/apps" className="home-store-badge">
              <img src={STORE_BADGE} alt="Get Vyaha on Google Play" />
            </Link>
            <Link to="/restaurants" className="home-btn home-btn--ghost">
              Partner with Vyaha
            </Link>
          </div>
        </div>

        <div
          className={`home-hero__scroll ${scrollHint ? 'is-visible' : ''}`}
          aria-hidden="true"
        >
          <span />
          Scroll
        </div>
      </section>

      <main className="home-main">
        <section className="home-promise home-reveal" ref={promiseRef}>
          <div className="home-promise__copy">
            <p className="home-eyebrow">Hyperlocal by design</p>
            <h2>Local kitchens. Fair totals. Faster routes.</h2>
            <p>
              Vyaha connects you to nearby restaurants without the price fog —
              what you see on the menu is what you pay for the food.
            </p>
          </div>

          <ul className="home-promise__meter" aria-label="Vyaha strengths">
            <li>
              <strong>100%</strong>
              <span>Genuine menu prices</span>
            </li>
            <li>
              <strong>Local</strong>
              <span>Neighborhood restaurants</span>
            </li>
            <li>
              <strong>Clear</strong>
              <span>Transparent delivery fees</span>
            </li>
          </ul>
        </section>

        <section className="home-trio home-reveal" ref={appsRef} aria-label="Vyaha apps">
          <div className="home-trio__intro">
            <p className="home-eyebrow">Three apps. One neighborhood.</p>
            <h2>Built for partners, customers, and riders.</h2>
          </div>

          <div className="home-trio__grid">
            <article className="home-trio__card home-trio__card--partner">
              <img src={vyahaLogos.partner} alt="" />
              <span className="home-trio__label">Partner app</span>
              <h3>For restaurants</h3>
              <ul>
                <li>We take as little commission as possible</li>
                <li>Easy menu updates for every shift change</li>
                <li>We send your money within 2 weeks</li>
                <li>Support on everything you need</li>
              </ul>
              <Link to="/restaurants">
                Partner with Vyaha <span aria-hidden="true">→</span>
              </Link>
            </article>

            <article className="home-trio__card home-trio__card--customer">
              <img src={vyahaLogos.customer} alt="" />
              <span className="home-trio__label">Customer app</span>
              <h3>For food lovers</h3>
              <ul>
                <li>Genuine menu prices — no extra cost</li>
                <li>Explore undiscovered shops and restaurants</li>
                <li>Try different foods from nearby kitchens</li>
              </ul>
              <Link to="/apps">
                Explore Customer App <span aria-hidden="true">→</span>
              </Link>
            </article>

            <article className="home-trio__card home-trio__card--delivery">
              <img src={vyahaLogos.delivery} alt="" />
              <span className="home-trio__label">Delivery app</span>
              <h3>For delivery partners</h3>
              <ul>
                <li>No onboarding fee</li>
                <li>Your hard work, your money</li>
                <li>Easy money withdrawal</li>
              </ul>
              <Link to="/delivery">
                Start Delivering <span aria-hidden="true">→</span>
              </Link>
            </article>
          </div>
        </section>

        <section className="home-value home-reveal" ref={valueRef}>
          <div className="home-value__glow" aria-hidden="true" />
          <p className="home-eyebrow home-eyebrow--lite">We value your money</p>
          <h2>Fair prices. Local restaurants. No unnecessary surprises.</h2>
          <p className="home-value__lede">
            Built for everyday ordering — genuine menu prices, clear fees, and a
            local-first model where customers and nearby businesses win together.
          </p>

          <ol className="home-value__list">
            <li>
              <span>01</span>
              <h3>Transparent totals</h3>
              <p>Know what you are paying before you confirm.</p>
            </li>
            <li>
              <span>02</span>
              <h3>Genuine menu prices</h3>
              <p>Discover local food without inflated listing theater.</p>
            </li>
            <li>
              <span>03</span>
              <h3>Built for neighborhoods</h3>
              <p>Shorter routes mean fresher food and steadier delivery.</p>
            </li>
          </ol>
        </section>

        <section className="home-launch home-reveal" ref={launchRef}>
          <div className="home-launch__panel">
            <div className="home-launch__copy">
              <p className="home-eyebrow">Coming to Play Store</p>
              <h2>Vyaha Customer is preparing for release</h2>
              <p>
                Official store links will land here after review approval. For
                early access or support, reach the Vyaha team directly.
              </p>
              <div className="home-launch__actions">
                <Link to="/apps" className="home-store-badge">
                  <img src={STORE_BADGE} alt="Vyaha Play Store release information" />
                </Link>
                <a href="mailto:support@vyaha.com" className="home-btn home-btn--solid">
                  Contact support
                </a>
              </div>
            </div>

            <div className="home-launch__status" aria-label="Release status">
              <span className="home-launch__pulse" />
              <p>Release status</p>
              <strong>Android app under review</strong>
              <span>Use only links from vyaha.com or official stores.</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Home;
