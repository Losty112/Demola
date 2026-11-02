/**
 * Fixed full-screen background: the hospital video (real building -> blueprint -> digital twin -> building).
 * `dim` darkens it for reading stages; the poster image shows while loading and for reduced-motion users.
 * Muted, looping and inline so browsers allow autoplay (also on phones).
 */
export function BackgroundVideo({ dim }: { dim: "hero" | "reading" }) {
  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 bg-night bg-cover bg-center" style={{ backgroundImage: "url(/media/hospital-hero-poster.jpg)" }}>
      <video className="bg-video h-full w-full object-cover" autoPlay muted loop playsInline preload="auto" poster="/media/hospital-hero-poster.jpg">
        <source src="/media/hospital-hero.mp4" type="video/mp4" />
      </video>
      {/* readability overlays: blue-black tint + vertical gradient (+ strong dim while reading) */}
      <div className={`absolute inset-0 transition-opacity duration-700 ${dim === "hero" ? "bg-night/45" : "bg-night/80"}`} />
      <div className="absolute inset-0 bg-gradient-to-b from-night/70 via-transparent to-night/90" />
    </div>
  );
}
