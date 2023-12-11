import streamlit as st
import pandas as pd
from ui_helpers import cta, footer, hide_fullscreen_button

hide_fullscreen_button()

with st.sidebar:
  st.write("")    
  cta()    
  
st.header("Banodoco Ownership - Explanation, Disclaimers & FAQ")

st.write("Our goal is to build Banodoco into a great business that can support the development of the open source AI art ecosystem - by creating a company that earns money & is an extremely attractive investment for those who believe in our mission and open source.")
st.write("Most startups give out 90% of their ownership to founders and 10% to early employees:")
st.image('https://banodoco.s3.amazonaws.com/images/typical_startup_equity.webp')
st.write("However, if you believe as we do that we’re in a space that will constantly change for the next decade and that this evolution will be driven by open source ingenuity, this approach doesn’t make sense.")
st.write("Instead, we're choosing a structure that aims to incentivise and inspire open source ingenuity in a cohesive direction throughout a far longer period - by sharing 100% of our equity with contributors over the first 8.5 years:")
st.image('https://banodoco.s3.amazonaws.com/images/open_source_native.webp')

st.write("Practically, as per the illustration, this means that we’ll split 1% per month between people who contribute open source work that's aligned with our core goals.")
st.write("How this is distributed will constantly evolve as we figure out the best model - but we hope to arrive at a consistent approach over the first 2 years that is fair and inspires the right kind of contributions.")

st.header("Disclaimers:")

st.markdown("**1) We’re not even officially incorporated yet and there won’t be legal documentation for a while**")
st.markdown("Our plan is to raise money early next year and use this to hire fancy lawyers who help us figure out how to implement this - before then, it’ll be a gentleman’s agreement.")

st.markdown("**2) Startup equity is highly-speculative**")
st.markdown("Our goal is that we'll be worth a lot someday - and in this world, even 0.1% will probably be a decent amount of money - but that is *objectively* unlikely. Given this, don’t do anything because you want to get rich. Maybe you will, but really you should do it because you love what it can be and what you’re working on - and feel good that - if our collected efforts to create something valuable - you may share in that.")

st.markdown("**3) Figuring this out will be an ever-evolving process - and we will make mistakes**")
st.markdown("I believe that this fundamental approach makes sense but figuring out how to actually implement it will take time. We’ll also make mistakes along the way - if you feel we've made a mistake, please let me know. I always will want to hear if you feel anything isn't right.")

st.markdown("**4) How the ‘ownership’ will be structured is unclear & lots of stuff is TBD**")
st.markdown("For example, it may not literally be ownership, but possibly an agreement that the grantee can buy equity from us at a price of 0.01c when the equity becomes liquid. However, whatever way it’s structured, my goal is that it means that the realisable gains from it are exactly proportional to the percentage of ownership - say, if the company is valued at 1b USD, and you have 1% equity, that will be worth exactly 1% of that (pre-tax of course).")

st.markdown("**5) Ownership will get diluted as we take on investment, or as we allocate more equity for contributors**")
st.markdown("Say, for example, we get an investment of 5m USD at a 50m USD valuation. That means that the ownership pool for contributors (including me) will be diluted. In the case of the above example, it would mean that what was once 0.1% of the whole entity, would now be 0.091%. However, this would mostly be offset by the actual value increasing as the percentage decreases. We may also allocate more ownership to contributors - which would have the same effect. While things may change, I can only promise that every change that impacts owners will impact me equally.")


st.header("Ownership grants to date:")

data = {
    'Month': ['November, 2022', 'December, 2022', 'January, 2023', 'February, 2023', 'March, 2023', 'April, 2023', 'May, 2023', 'June, 2023', 'July, 2023', 'August, 2023', 'September, 2023', 'October, 2023', 'November, 2023'],
    'Ownership Grants': ['POM', 'POM', 'POM', 'POM', 'POM', 'POM', 'POM; Lone_Samurai', 'POM; Lone_Samurai', 'POM; Lone_Samurai', 'itsB34STW4RS; Kosinkadink; PBPBPB; Cubey; lone_samurai; neggles; toyxyz; POM', 'Inner_Reflections_AI; Kaïros; Kosinkadink; manshoety; Antzu ☕; lone_samurai; Draken; jfischoff; RedStrawberries; itsB34STW4RS; Fizzledorf; Consumption','kijai; piblarg; drex15704080; fictiverse; fannovel16; citizenplain; kosinkadink; jfischoff; lone_samurai; fizzledorf; anime_is_real; fabdream; cainisable; redstrawberries; manshoety; drakenza; consumption_', 'Kijai; toyxyz; Ceyuan Yang/Animatediff team x2; Siraj; comfy; Fannovel16; melmass; Fictiverse; Fizzledorf; Inner_Reflections_AI; Kosinkadink; Impactframes. s; matt3o; Simian Luo; jboogx.creative; Nathan Shipley; lone_samurai; anime_is_real; Dr.Lt.Data']

}

df = pd.DataFrame(data)[::-1].reset_index(drop=True)

st.write("As per the above, each month, 1% of the company will be split equally between contributors. The below table shows the contributors who split grants each month:")
st.dataframe(df,use_container_width=True, hide_index=True)

st.info("Note: POM will likely give a significant portion of his equity to new contributors who have been working on their projects for some time and wish to merge efforts.  These changes will be reflected here.")

st.header("FAQ:")

st.markdown("**“Why should I trust you?”**")
st.markdown("I think that this is a very fair question. - I could in theory go back on this when the company is valuable. In fact, there are loads of ways people screw others in all kinds of equity arrangements. While I do hope to get wealthy enough to not have to worry about money, that's not strictly my goal - in fact, my goal is to do stuff like this for the rest of my life and doing anything that would make me untrustworthy in the eyes of the types of people I want to collaborate with would be stupid and short-sighted.")

st.markdown("**“Does this mean that people who get equity will control the company?”**")
st.markdown("Honestly, I don’t know about this yet - my perception is that most DAOs and efforts at distributed control have been very chaotic. It could make sense long-term to have a “Benevolent dictator for life” set-up with checks and balances, or something like a distributed rule. Right now, I don’t know but am slightly biasing towards this. I only ask you to trust me not to be stupid and short-sighted.")

st.markdown("**“If the equity becomes valuable, how will I be able to sell it?”**")
st.markdown("This is TBC but many private startups like SpaceX offer equity holders the opportunity to sell at pre-determined times and we’ll probably do something similar. What we don't want is for our equity to become like a token that's speculatively bought and sold, so will put constraints to avoid this - probably time-bound.")

st.markdown("**“What about crypto?”**")
st.markdown("While I dislke a lot of the association crypto currently has, it could in theory be possible to implement this using crypto - if you have any ideas on how to achieve this in a way that isn’t bullshitty and aligns with the above goals, please get in touch.")

st.markdown("**“What about tax?”**")
st.markdown("We’ll try to set it up in a way that tax is only due upon actual gains actually being realised - meaning, you’d only pay based on actual money you make. Again, I'll need to hire fancy lawyers and accountants to figure this out so have no clue what this means right now.")

st.markdown("**“What happens if the company is sold before the equity is allocated?”**")
st.markdown("Firstly, our intention is to build this into a self-sustaining entity for the long-term. However, if we do get purchased by another company, equity will be distributed proportionally based on the allocations made to date. For example, if someone holds 1% of the equity and 33.3% of the total equity has been allocated, they would receive 3% of the purchase price.")

st.markdown("**“I have another question”**")
st.markdown("DM me on [our Discord](https://discord.com/invite/eKQm3uHKx2)!")

footer()