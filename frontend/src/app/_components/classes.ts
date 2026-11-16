// As peças que a apresentação repete: tinta clara sobre a gravação escura.
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-night-ink';

export const presentationClasses = {
  focus,
  cta: `${focus} inline-flex h-11 items-center gap-2 rounded-full bg-night-ink px-5.5 text-15 font-semibold text-ink transition-[transform,background-color] duration-200 ease-book hover:-translate-y-px hover:bg-white active:translate-y-0`,
  navLink: `${focus} rounded-full px-3.5 py-2 text-15 text-night-soft transition-colors duration-200 hover:bg-white/8 hover:text-night-ink max-sm:hidden`,
  company: 'mt-1.5 mb-5.5 font-serif text-30 leading-[1.15]',
  section: 'pb-40 max-sm:pb-28',
  h2: 'font-serif text-[clamp(40px,5vw,64px)] leading-none font-normal tracking-[-0.02em]',
  intro: 'mt-5 mb-10 max-w-[62ch] text-18 text-night-soft',
} as const;
