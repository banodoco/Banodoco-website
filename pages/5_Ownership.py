import streamlit as st

import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from Home import cta,interpolation_element,footer


st.set_page_config(page_title="Banodoco - Ownership")
hide_img = '''
<style>
button[title="View fullscreen"]{
    display: none;}
</style>
'''
# st.markdown(hide_img, unsafe_allow_html=True)

with st.sidebar:
  st.write("")    
  cta()    
  

st.header("Banodoco Ownership - Explanation, Disclaimers & FAQ")



st.write("Our goal is to make Banodoco into a great business that can support/spur the development of OSS art models - by creating a product make earns money & is an extremely attractive investment to those who believe in our mission and open source.")
st.write("To do this, we're training a model (early versions below) on motion key frames - pairs of images -  alongside a description of the difference between them.")
st.write("Most startups give out 90% to founders and 10% to early employees, and then often give another equity allocation for later employees:")
st.image('https://banodoco.s3.amazonaws.com/images/typical_startup_equity.webp')
st.write("However, if you believe as I do that we’re in a space that will constantly change for the next decade and that this evolution happening in the right way and being open source will be what makes us the most successful, that kind of structure makes no sense.")
st.write("Instead, you’d choose a structure that aims to incentivise and inspire open source ingenuity in the right direction throughout a far longer period:")
st.image('https://banodoco.s3.amazonaws.com/images/open_source_native.webp')

st.write("Practically, as per the illustration, this means that we’ll split 1% per month between people who contribute to the core goals.")
st.write("How who gets what will evolve constantly as we figure out the best approach - more on this below, but first disclaimers.")


st.header("Disclaimers:")

st.markdown("**1) We’re not even officially incorporated yet and there won’t be legal documentation for a while**")
st.markdown("Our plan is to raise money and use this to hire fancy lawyers who help us figure out how to implement this - before then, it’ll be a gentleman’s agreement.")

st.markdown("**2) Startup equity is highly-speculative**")
st.markdown("Startup equity is obviously highly speculative. My goal is that we'll be worth a lot someday - and in this world, 0.1% will probably be a decent amount of money - but that is *objectively* unlikely. Given this, don’t do this because you want to get rich. Maybe you will, but really you should do it because you love what it can be and what you’re working on - and feel good that - if our collected efforts to create something valuable for both us and the world - you may share in that.")

st.markdown("**3) Figuring this out will be an ever-evolving process - and we will make mistakes**")
st.markdown("I believe that this fundamental approach makes sense but figuring out how to actually implement it will take time. We’ll also make mistakes along the way.")

st.markdown("**4) How the ‘ownership’ will be structured is unclear & lots of stuff is TBD**")
st.markdown("For example, it may not literally be ownership, but possible an agreement that the grantee can buy equity from us at a price of 0.01c when the equity becomes valuable. However, whatever way it’s structure my goal is that it means that the realisable gains from it are exactly proportional to the percentage of ownership - say if the company is values at $1b, and you have 1% equity, that will be worth exactly 1% of that (pre-tax of course).")

st.markdown("**5) Ownership will get diluted as we take on investment, or allocate more equity for contributors**")
st.markdown("Say, for example, we get an investment of $5m at a $50m valuation. That means that the ownership pool for contributors (including me) will be diluted. In the case of the above example, it would mean that what was once 0.1% of the whole entity, would now be 0.091%. However, this would be offset by the actual value increasing as the percentage decreases. We may also allocate more ownership to contributors - which would have the same effect. While things may change, I can only promise that every change that impacts owners will impact me equally.")

st.header("FAQ:")

st.markdown("**“Why should I trust you?”**")
st.markdown("I think that this is a very fair question. - I could in theory go back on this when the company is valuable and have way more money for fancy lawyers. In fact, there are loads of ways people screw others in these situations. All I can say is that it would be extremely short-sighted of me to ever do anything that draws the ire of the community I’ll be dependent upon to build this with. It would be stupid and very short-term oriented thing to do. Ideally, you won’t have to trust me long-term - due to legal guarantees that put this stuff in stone - but short-term, I’ll ask you to trust me not to be that stupid.")

st.markdown("**“Does this mean that people who get equity will control the company?”**")
st.markdown("Honestly, I don’t know about this yet. My perception is that most DAOs and distributed control have been very chaotic. It could make sense long-term to have a “Benevolent dictator for life” setup with checks and balances, or something like a distributed rule. Right now, I don’t know.")

st.markdown("**“If the equity becomes valuable, how will I be able to sell it?”**")
st.markdown("This is TBC but many private startups like SpaceX offer equity holders the opportunity to sell at pre-determined times and we’ll probably do something similar.")

st.markdown("**“What about crypto?”**")
st.markdown("It could in theory be possible to have some kind of crypto approach - if you have any ideas on how to achieve this in a way that isn’t bullshitty and aligns with the above goals, please get in touch.")

st.markdown("**“What about tax?”**")
st.markdown("We’ll try to set it up in a way that tax is only due upon actual realised gains - meaning, you’d only pay based on actual money you make.")

st.markdown("**“I have another question”**")
st.markdown("DM me on [our Discord](https://discord.com/invite/eKQm3uHKx2)!")


footer()