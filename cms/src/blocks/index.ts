import type { Block } from 'payload'

import { BenefitsBento } from './BenefitsBento'
import { ChallengesSection } from './ChallengesSection'
import { CtaSection } from './CtaSection'
import { EcosystemDiagramSection } from './EcosystemDiagramSection'
import { Hero } from './Hero'
import { HomepageEventsSection } from './HomepageEventsSection'
import { HomepagePartnersSection } from './HomepagePartnersSection'
import { KeyTopicsSliderSection } from './KeyTopicsSliderSection'
import { ProgramsSection } from './ProgramsSection'
import { WhyJoinUsSection } from './WhyJoinUsSection'

/** The 10 homepage blocks, in the baseline's on-page order. */
export const homepageBlocks: Block[] = [
  Hero,
  BenefitsBento,
  ProgramsSection,
  ChallengesSection,
  WhyJoinUsSection,
  KeyTopicsSliderSection,
  HomepagePartnersSection,
  EcosystemDiagramSection,
  HomepageEventsSection,
  CtaSection,
]

export {
  BenefitsBento,
  ChallengesSection,
  CtaSection,
  EcosystemDiagramSection,
  Hero,
  HomepageEventsSection,
  HomepagePartnersSection,
  KeyTopicsSliderSection,
  ProgramsSection,
  WhyJoinUsSection,
}
