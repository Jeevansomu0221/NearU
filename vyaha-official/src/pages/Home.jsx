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
  const stageRef = useRef(null);
  const promiseRef = useReveal(reducedMotion);
  const stageCopyRef = useReveal(reducedMotion);
  const valueRef = useReveal(reducedMotion);
  const ecosystemRef = useReveal(reducedMotion);
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

      const stage = stageRef.current;
      if (stage) {
        const rect = stage.getBoundingClientRect();
        const visible = 1 - Math.min(1, Math.max(0, rect.top / window.innerHeight));
        stage.style.setProperty('--route-progress', String(visible));
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

        <section className="home-stage" ref={stageRef} aria-label="Vyaha app experience">
          <div className="home-stage__copy home-reveal" ref={stageCopyRef}>
            <p className="home-eyebrow">Inside the app</p>
            <h2>From kitchen to doorstep — watched live.</h2>
            <p>
              Follow every local hop in one continuous stream: order placed,
              kitchen cooking, rider moving, food at your door.
            </p>
          </div>

          <div className="home-journey" aria-hidden="true">
            <div className="home-journey__glow home-journey__glow--a" />
            <div className="home-journey__glow home-journey__glow--b" />

            <ol className="home-journey__steps">
              <li className="home-journey__step home-journey__step--kitchen">
                <img src={vyahaLogos.partner} alt="" />
                <strong>Kitchen</strong>
                <span>Order accepted</span>
              </li>
              <li className="home-journey__step home-journey__step--rider">
                <img src={vyahaLogos.delivery} alt="" />
                <strong>Rider</strong>
                <span>On the move</span>
              </li>
              <li className="home-journey__step home-journey__step--home">
                <img src={vyahaLogos.customer} alt="" />
                <strong>Home</strong>
                <span>Genuine total paid</span>
              </li>
            </ol>

            <div className="home-journey__track">
              <svg className="home-journey__path" viewBox="0 0 900 220" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="vyahaRoute" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#2f6bff" />
                    <stop offset="50%" stopColor="#e23744" />
                    <stop offset="100%" stopColor="#1c9b55" />
                  </linearGradient>
                </defs>
                <path
                  className="home-journey__rail"
                  d="M40 150 C 180 40, 320 40, 450 120 C 580 200, 720 200, 860 70"
                />
                <path
                  className="home-journey__rail home-journey__rail--live"
                  d="M40 150 C 180 40, 320 40, 450 120 C 580 200, 720 200, 860 70"
                />
                <g className="home-journey__courier">
                  <circle r="11" fill="#fff" />
                  <circle r="5.5" fill="#e23744" />
                  <animateMotion
                    dur="4.8s"
                    repeatCount="indefinite"
                    path="M40 150 C 180 40, 320 40, 450 120 C 580 200, 720 200, 860 70"
                  />
                </g>
              </svg>
            </div>

            <div className="home-journey__ticker">
              <div className="home-journey__chip home-journey__chip--live">
                <i />
                Live order tracking
              </div>
              <div className="home-journey__chip">ETA 12 min</div>
              <div className="home-journey__chip home-journey__chip--price">
                Menu price · no markup fog
              </div>
            </div>
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

        <section className="home-ecosystem home-reveal" ref={ecosystemRef}>
          <p className="home-eyebrow">One local network</p>
          <h2>Built for every side of the order</h2>
          <p className="home-ecosystem__lede">
            Customers, restaurants, and riders each get a focused app — connected
            by one Vyaha platform.
          </p>

          <div className="home-ecosystem__grid">
            <Link to="/apps" className="home-app home-app--customer">
              <img src={vyahaLogos.customer} alt="" />
              <span className="home-app__label">For customers</span>
              <h3>Discover nearby food without the price confusion.</h3>
              <p>
                Browse local restaurants, review clear totals, place orders, and
                track delivery from one simple app.
              </p>
              <em>
                Explore Customer App <span aria-hidden="true">→</span>
              </em>
            </Link>

            <Link to="/restaurants" className="home-app home-app--partner">
              <img src={vyahaLogos.partner} alt="" />
              <span className="home-app__label">For restaurants</span>
              <h3>Run orders, menus, and growth from a cleaner workspace.</h3>
              <p>
                Accept orders, keep menus current, manage verification, and serve
                your neighborhood with fewer moving parts.
              </p>
              <em>
                Partner With Vyaha <span aria-hidden="true">→</span>
              </em>
            </Link>

            <Link to="/delivery" className="home-app home-app--delivery">
              <img src={vyahaLogos.delivery} alt="" />
              <span className="home-app__label">For delivery partners</span>
              <h3>Accept local jobs and keep earnings easy to follow.</h3>
              <p>
                Go available, view nearby orders, update delivery status, and
                track work with a delivery-first app.
              </p>
              <em>
                Start Delivering <span aria-hidden="true">→</span>
              </em>
            </Link>
          </div>
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
