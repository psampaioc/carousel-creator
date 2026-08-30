type OnlineEvent = { _id: string; title: string; startAt?: number; sources: Array<{ _id: string; url: string; label: string }> };

export function OnlineEventsSlide({ title, body, accent, events }: { title: string; body: string; accent: string; events: OnlineEvent[] }) {
  return <article className="instagram-slide online-slide" style={{ "--slide-accent": accent } as React.CSSProperties}><p className="slide-mark">ONE MORE THING</p><div><h2>{title}</h2><p>{body}</p><ol className="online-event-list">{events.slice(0, 5).map((event) => <li key={event._id}><strong>{event.title}</strong>{event.startAt ? <span>{new Intl.DateTimeFormat("pt-PT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(event.startAt)}</span> : null}{event.sources[0] ? <small>Source: {event.sources[0].label}</small> : null}</li>)}</ol></div><footer>Online additions · final slide</footer></article>;
}
