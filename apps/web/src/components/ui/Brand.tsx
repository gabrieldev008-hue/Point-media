export function PointMark({ className = '' }: { className?: string }) {
  return <img className={`point-mark ${className}`} src="/branding/point-media.png" width="2048" height="701" alt="" aria-hidden="true" decoding="async"/>;
}
export function Wordmark() {
  return <img className="wordmark" src="/branding/point-media.png" width="2048" height="701" alt="Point Media" decoding="async"/>;
}
