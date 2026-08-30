export function EventSlide({ title, body, accent, shape, number }: { title: string; body: string; accent: string; shape: string; number: number }) {
  return <article className={`instagram-slide event-slide shape-${shape}`} style={{ "--slide-accent": accent } as React.CSSProperties}><p className="slide-mark">COIMBRA / {String(number).padStart(2, "0")}</p><div className="slide-orbit" /><h2>{title}</h2><p>{body}</p><footer>Swipe for the week →</footer></article>;
}
