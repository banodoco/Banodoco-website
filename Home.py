import streamlit as st
from ui_helpers import cta, footer, hide_fullscreen_button

st.set_page_config(page_title="Banodoco",page_icon="🎨")

hide_fullscreen_button()

with st.sidebar:
  st.write("")    
  cta()        

header1, header2 = st.columns(2)
with header1:
  st.write("")
  
  st.header("For those who wish to harness the chaos of open source AI art")
  st.write("We believe that AI has the potential to allow billions to experience creative fulfilment this century. However, in order to reach this potential, artistic control is key - it's the difference between something feeling like it was made by you rather than for you. To unlock the multitude of control types and artistic flows possible with AI, we want to build tooling and infrastructure to empower a community of tool-builders, who in-turn empower a world of budding artists.")  
  cta()
  
with header2:
  st.write("")
  st.image("https://banodoco.s3.amazonaws.com/0.png",use_column_width='always')

st.markdown("***")

b1, b2 = st.columns([1, 1])

with b1:

  st.subheader("Our plan")
  st.image("https://banodoco.s3.amazonaws.com/3.png",use_column_width='always')
  st.write("AI will relentless evolve this century - our plan to to create a tools, culture, infrastructure, and incentives that allow open source-bsaed tools to relentlessly evolve with it.")  
  st.markdown('<a href="/Plan" target="_self">Learn about our plan</a>', unsafe_allow_html=True)

with b2:
  st.subheader("Try Dough")
  st.image("https://banodoco.s3.amazonaws.com/2.png",use_column_width='always')
  st.write("Dough is our first tool, built on top of our [Steerable Motion node](https://github.com/banodoco/steerable-motion). It's meant to serve as one example of how powerful a tool that that combines different workflows can be.")
  st.markdown('<a href="/Dough" target="_self">Learn about Dough</a>', unsafe_allow_html=True)

st.markdown("***")
a1, a2 = st.columns([1, 1])

with a1:    
  st.subheader("Our ownership")
  st.image("https://banodoco.s3.amazonaws.com/1.png",use_column_width='always')
  st.write("We're sharing the returns on 100% of our ownership (pre-investment dilution) with people who contribute to open source projects that are aligned with our mission. ")
  st.markdown('<a href="/Ownership" target="_self">Learn about our ownership</a>', unsafe_allow_html=True)

with a2:  

  st.subheader("Our community")
  st.image("https://banodoco.s3.amazonaws.com/4.png",use_column_width='always')
  
  st.write("We're nurturing an environment where talented, passionate engineers, inventors and artists openly discover, build and learn together, and are rewarded for doing so.")
  st.markdown('<a href="/Community" target="_self">Learn about our community</a>', unsafe_allow_html=True)         


footer()