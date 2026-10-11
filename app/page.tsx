'use client';
import { useRef } from 'react';
import { Hero } from '@/components/sections/Hero';
import { Services } from '@/components/sections/Services';
import { Footer } from '@/components/ui/Footer';

export default function HomePage() {
  const agendaRef = useRef<HTMLDivElement>(null);
  const scrollToAgenda = () => agendaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <main>
      <Hero onAgendaClick={scrollToAgenda} />
      <Services />
      <div ref={agendaRef} style={{ scrollMarginTop: 64 }}>
        {/* Task 12 replaces this with <BookingFlow /> */}
      </div>
      <Footer note="Clases virtuales 1-on-1 · A1 – C1 · TOEFL, IELTS, CELPIP, OET" />
    </main>
  );
}
