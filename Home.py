import streamlit as st
from ui_helpers import cta, footer, hide_fullscreen_button

st.set_page_config(page_title="Banodoco - Home")

hide_fullscreen_button()

with st.sidebar:
  st.write("")    
  cta()        

header1, header2 = st.columns(2)
with header1:
  st.header("For those who want to harness the chaos of open source AI art")
  st.write("With our community, we want to create tools that help artists harness the chaos of open source AI.")
  st.write("We believe that AI can allow people to create any video they can imagine - but, to unlock this potential, we must empower a community of tool-builders, who in turn empower artists.")  
  cta()
  
with header2:
  st.image("https://banodoco.s3.amazonaws.com/images/header_image.webp",use_column_width='always')

st.markdown("***")

a1, a2 = st.columns([1, 1])
with a1:  
  st.subheader("Our philosophy")
  st.image("https://banodoco.s3.amazonaws.com/images/philosophy_image.webp",use_column_width='always')
  st.write("We believe the way to maximise the quality of AI art is to empower open source tool-builders, who in turn empower artists.")
  st.markdown('<a href="/Philosophy" target="_self">Learn about our philosophy</a>', unsafe_allow_html=True)
       
with a2:    
  st.subheader("Our ownership")
  st.image("https://banodoco.s3.amazonaws.com/images/roadmap_image.webp",use_column_width='always')
  st.write("We're sharing 100% of our ownership (aside from investment dilution) with people who contribute to OS projects that are aligned with our mission.")
  st.markdown('<a href="/Ownership" target="_self">Learn about our ownership</a>', unsafe_allow_html=True)

footer()