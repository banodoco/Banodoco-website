import { useState } from 'react';
import { GrantsTable } from '@/components/sections/Ownership/GrantsTable';
import { TransfersTable } from '@/components/sections/Ownership/TransfersTable';
import { OwnershipTable } from '@/components/sections/Ownership/OwnershipTable';
import { AccordionItem } from '@/components/sections/Ownership/Accordion';
import { useOwnershipData } from '@/components/sections/Ownership/useOwnershipData';
import { grants, transfers } from '@/components/sections/Ownership/data';

const OwnershipPage = () => {
  const [activeTab, setActiveTab] = useState<'grants-transfers' | 'ownership-to-date'>('grants-transfers');
  const { data: ownershipData, loading: ownershipLoading, error: ownershipError } = useOwnershipData();

  return (
    <div className="min-h-screen bg-[#f5f5f3] text-gray-900">
      <div className="max-w-4xl mx-auto px-6 md:px-16 py-12 md:py-16">
        {/* Hero Title */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-normal tracking-tight leading-[1.05] mb-6 text-gray-900">
          Ownership - Explanation, Disclaimers & Grants to Date
        </h1>

        {/* Main Content Section */}
        <div className="space-y-6 text-base md:text-lg leading-relaxed text-gray-800 relative">
          {/* Stacked right images */}
          <div className="float-none md:float-right md:clear-right max-w-full md:max-w-[45%] md:ml-6 mb-6">
            <img 
              src="https://banodoco.s3.amazonaws.com/images/typical_startup_equity.webp" 
              alt="Typical Startup Equity" 
              className="max-w-full h-auto"
            />
          </div>
          <div className="float-none md:float-right md:clear-right max-w-full md:max-w-[45%] md:ml-6 mb-6">
            <img 
              src="https://banodoco.s3.amazonaws.com/images/open_source_native.webp" 
              alt="Open Source Native" 
              className="max-w-full h-auto"
            />
          </div>

          <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
            Our goal is to build Banodoco into a successful business that can help support the development of the open source AI art ecosystem. To do this, we're creating a commercial entity that aims to be an extremely attractive investment for those who believe in our mission and open source. You can read more about our plan <a href="https://banodoco.ai" className="text-gray-900 underline hover:text-gray-700 transition-colors">here</a>.
          </p>

          <p>
            Most startups give out 90% of their ownership to founders and 10% to early employees.
          </p>

          <p>
            However, if you believe as we do that we're in a space that will relentlessly evolve over the coming decades and that this evolution will be driven by open source ingenuity, this incentive structure doesn't reflect where the value will be created - or incentivise the right kinds of contributions.
          </p>

          <p>
            Instead, we're choosing a structure that aims to incentivise and inspire open source ingenuity in a cohesive direction throughout a far longer period - by sharing 100% of our equity with contributors over the first 8.5 years.
          </p>

          <p>
            Practically, as per the illustration, this means that we'll split 1% per month between people who contribute open source work that's aligned with our core goals.
          </p>

          <p>
            How this is distributed will constantly evolve as we figure out the best model - but we hope to arrive at a consistent approach over the first 2 years that is fair and inspires the right kind of contributions.
          </p>

          {/* Clear float */}
          <div className="clear-both mt-12"></div>

          <div className="my-12 border-t border-gray-300"></div>

          {/* Six Disclaimers */}
          <h3 className="text-4xl md:text-5xl font-normal tracking-tight leading-[1.15] mb-8 mt-12 text-gray-900">Six Disclaimers:</h3>
          <div className="space-y-4">
            <AccordionItem
              header="1) We haven't set this up legally yet"
              content={
                <div className="space-y-3">
                  <p>
                    Doing this will be costly and time-consuming - it'll become a priority as soon as we have the resources to do so - which will also hopefully be when people start to actually care!
                  </p>
                  <div className="float-none md:float-left md:max-w-[45%] md:mr-6 mb-6 max-w-full">
                    <img 
                      src="https://banodoco.s3.amazonaws.com/plan/structure.png" 
                      alt="Corporate Structure Example" 
                      className="max-w-full h-auto"
                    />
                  </div>
                  <p>
                    To achieve this, we'll likely have an entity that owns the "founder's" stock on behalf of the community and distributes realised gains at pre-agreed points - with investors investing into the LLC that the foundation starts with owning entirely. This will allow us to be an attractive investment due to having a conventional underlying corporate structure, while allowing us to distribute gains via the foundation in a way that's fair and transparent to everyone in the community.
                  </p>
                  <p>
                    While the actual implementation of this is uncertain, below is an example of what it might look like from a corporate structure perspective:
                  </p>
                  <div className="clear-both mb-4"></div>
                </div>
              }
            />
            <AccordionItem
              header="2) Startup equity is highly-speculative"
              content={
                <p>
                  Our goal is that we'll be worth a lot someday - and in this world, even 0.05% will probably be a decent amount of money - but that is <em>objectively</em> unlikely. Given this, don't do anything because you want to get rich. Maybe you will, but really you should do it because you love what it can be and what you're working on - and feel good that - if our collected efforts to create something valuable - you may share in that.
                </p>
              }
            />
            <AccordionItem
              header="3) Grants will be biased towards core contributors and people who do things that are aligned with our goals"
              content={
                <p>
                  While we would like to reward people who contribute to everything, we're also trying to build a business that is successful. As such, we'll likely be biased towards rewarding people who are core to the business and who are contributing things that are most aligned with our goals.
                </p>
              }
            />
            <AccordionItem
              header="4) Figuring this out will be an ever-evolving process - and we will make mistakes"
              content={
                <p>
                  I believe that this fundamental approach makes sense but figuring out how to actually implement it will take time. We'll also make mistakes along the way - if you feel we've made a mistake, please let me know. I will always want to hear if you feel anything isn't right.
                </p>
              }
            />
            <AccordionItem
              header="5) How the 'ownership' will be structured is unclear & lots of stuff is TBD"
              content={
                <p>
                  For example, it may not literally be ownership, but possibly an agreement that the grantee can buy equity from us at a price of 0.01c when the equity becomes liquid. However, whatever way it's structured, my goal is that it means that the realisable gains from it are exactly proportional to the percentage of ownership - say, if the company is valued at 1b USD, and you have 1% equity, that will be worth exactly 1% of that (pre-tax of course).
                </p>
              }
            />
            <AccordionItem
              header="6) Ownership will get diluted as we take on investment, or as we allocate more equity for contributors"
              content={
                <p>
                  Say, for example, we get an investment of 5m USD at a 50m USD valuation. That means that the ownership pool for contributors (including me) will be diluted. In the case of the above example, it would mean that what was once 0.1% of the whole entity, would now be 0.091%. However, this would mostly be offset by the actual value increasing as the percentage decreases. We may also allocate more ownership to contributors - which would have the same effect. While things may change, I can only promise that every change that impacts owners will impact me equally.
                </p>
              }
            />
          </div>

          <div className="my-12 border-t border-gray-300"></div>

          {/* Grants, transfers, and ownership to date */}
          <h3 className="text-4xl md:text-5xl font-normal tracking-tight leading-[1.15] mb-8 mt-12 text-gray-900">Grants, transfers, and ownership to date</h3>
          <p>
            As per the above, each month, 1% of the company will be split equally between contributors. Up until February 2024, the amount each month was split equally between all contributors. After this, instead of it being split equally, we'll split 0.25% to each major group - core, infrastructure builders, knowledge sharers, and artists. That means all the people listed in that group will get that 0.25% split between them.
          </p>
          <p>
            How this is distributed will constantly evolve as we figure out the best model - but we hope to arrive at a consistent approach over the first 2 years that is fair and inspires the right kind of contributions.
          </p>

          {/* Tabs */}
          <div className="mt-8">
            <div className="flex gap-2 mb-6 border-b border-gray-300">
              <button
                onClick={() => setActiveTab('grants-transfers')}
                className={`px-5 py-2 text-sm transition-colors relative ${
                  activeTab === 'grants-transfers'
                    ? 'text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Grants & transfers
                {activeTab === 'grants-transfers' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('ownership-to-date')}
                className={`px-5 py-2 text-sm transition-colors relative ${
                  activeTab === 'ownership-to-date'
                    ? 'text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Ownership to date
                {activeTab === 'ownership-to-date' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></span>
                )}
              </button>
            </div>

            {/* Warning Box */}
            <div className="bg-gray-50 border border-gray-300 rounded p-4 mb-6 text-sm text-gray-700">
              <p className="m-0">
                <strong>Note:</strong> There may be minor issues in this data. The ground source of truth for this will be the original announcements on Discord.
              </p>
            </div>

            {/* Tab Content */}
            {activeTab === 'grants-transfers' && (
              <div>
                <p className="mb-4">Below are the grants and transfers to date:</p>
                <div className="clear-both mt-8"></div>
                <div className="mt-8">
                  <GrantsTable grants={grants} />
                </div>
                <div className="mt-8">
                  <h3 className="text-xl font-bold mb-4">Additional Transfers</h3>
                  <p className="mb-4">
                    In addition to the above, holders may transfer equity to contributors at their discretion. This is subject to approval by POM. The below table shows the transfers to date:
                  </p>
                  <TransfersTable transfers={transfers} />
                </div>
              </div>
            )}

            {activeTab === 'ownership-to-date' && (
              <div>
                <p className="mb-4">Below is the current breakdown of equity distribution among all contributors:</p>
                {ownershipLoading ? (
                  <p className="text-gray-600">Loading ownership data...</p>
                ) : ownershipError ? (
                  <p className="text-red-600">Error loading ownership data: {ownershipError}</p>
                ) : (
                  <OwnershipTable ownershipData={ownershipData} />
                )}
              </div>
            )}
          </div>

          <div className="my-12 border-t border-gray-300"></div>

          {/* FAQ Section */}
          <h3 className="text-4xl md:text-5xl font-normal tracking-tight leading-[1.15] mb-8 mt-12 text-gray-900">Frequently Asked Questions:</h3>
          <div className="space-y-3">
            <AccordionItem
              header="What's your plan to make this actually valuable?"
              content={
                <p>
                  You can read more about what we're up to <a href="https://banodoco.ai/" className="text-blue-600 hover:underline">here</a> - more coming soon.
                </p>
              }
            />
            <AccordionItem
              header="Why should I trust you?"
              content={
                <p>
                  I think that this is a very fair question. I could in theory go back on this when the company is valuable. In fact, there are loads of ways people screw others in all kinds of equity arrangements. While I do hope to get wealthy enough to not have to worry about money, that's not strictly my goal. My goal is actually to do stuff like this for the rest of my life and doing anything that would make me untrustworthy in the eyes of the types of people I want to collaborate with would be stupid and short-sighted.
                </p>
              }
            />
            <AccordionItem
              header="If the equity becomes valuable, how will I be able to sell it?"
              content={
                <p>
                  This is TBC but many private startups like SpaceX offer equity holders the opportunity to sell at pre-determined times and we'll probably do something similar. What we don't want is for our equity to become like a token that's speculatively bought and sold, so will put constraints to avoid this - probably time-bound.
                </p>
              }
            />
            <AccordionItem
              header="What about crypto?"
              content={
                <p>
                  While I dislike a lot of the association crypto currently has, it could in theory be possible to implement this using crypto - if you have any ideas on how to achieve this in a way that isn't bullshitty and aligns with the above goals, please get in touch.
                </p>
              }
            />
            <AccordionItem
              header="What about tax?"
              content={
                <p>
                  We'll try to set it up in a way that tax is only due upon actual gains actually being realised - meaning, you'd only pay based on actual money you make. Again, I'll need to hire fancy lawyers and accountants to figure this out so have no clue what this means right now.
                </p>
              }
            />
            <AccordionItem
              header="What if I don't want it?"
              content={
                <p>
                  If you don't want it, your equity will be redistributed to other contributors proportionally.
                </p>
              }
            />
            <AccordionItem
              header="What happens if the company is sold before the equity is allocated?"
              content={
                <p>
                  Firstly, our intention is to build this into a self-sustaining entity for the long-term. However, if we do get purchased by another company, equity will be distributed proportionally based on the allocations made to date. For example, if someone holds 1% of the equity and 33.3% of the total equity has been allocated, they would receive 3% of the purchase price.
                </p>
              }
            />
            <AccordionItem
              header="I have another question"
              content={
                <p>
                  DM me on <a href="https://discord.gg/NnFxGvx94b" className="text-blue-600 hover:underline">our Discord</a>!
                </p>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnershipPage;
