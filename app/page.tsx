import HeroSection from "@/components/hero-section";
import { PhilosophySection } from "@/components/philosophy-section";
import { AboutExperienceSection } from "@/components/about-experience-section";
import { SmoothScroll } from "@/components/smooth-scroll";

export default function Home() {
    return (
        <main>
            <SmoothScroll>
                <HeroSection/>
                <PhilosophySection/>
                <AboutExperienceSection/>
            </SmoothScroll>
        </main>
    )
}
