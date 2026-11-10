import { BackgroundVideo } from "@/components/flow/BackgroundVideo";
import { StartScreen } from "@/components/flow/StartScreen";

/** Opening page. Every other view has its own page in the navigation bar. */
export default function HomePage() {
  return (
    <>
      <BackgroundVideo dim="hero" />
      <StartScreen />
    </>
  );
}
