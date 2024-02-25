import streamlit as st
from ui_helpers import cta, footer, hide_fullscreen_button

st.set_page_config(page_title="Banodoco - Home")

hide_fullscreen_button()

with st.sidebar:
  st.write("")    
  cta()        

header1, header2 = st.columns(2)
with header1:
  st.write("")
  
  st.header("For those who want to harness the chaos of open source AI art")
  st.write("With our community, we want to create tools that help artists harness the chaos of open source AI.")
  st.write("We believe that AI has the potential to allow people to craft videos that match their imagination precisely - but, to unlock this potential, we must empower a community of tool-builders, who in turn empower artists.")  
  cta()
  
with header2:
  st.image("https://banodoco.s3.amazonaws.com/0.png",use_column_width='always')

st.markdown("***")

b1, b2 = st.columns([1, 1])

with b1:
  st.subheader("Our philosophy")
  st.image("https://banodoco.s3.amazonaws.com/1.png",use_column_width='always')
  st.write("We believe that empowering a community of tool-builders is the best way to unlock the potential of open source AI.")
  st.markdown('<a href="/Philosophy" target="_self">Learn about our philosophy</a>', unsafe_allow_html=True)

with b2:
  st.subheader("Try Dough")
  st.image("https://banodoco.s3.amazonaws.com/2.png",use_column_width='always')
  st.write("Dough is our first tool, built to serve as an example of how powerful a tool that that combines different models and workflows can be.")
  st.markdown('<a href="https://github.com/banodoco/dough" target="_self">Learn about Dough</a>', unsafe_allow_html=True)

st.markdown("***")
a1, a2 = st.columns([1, 1])
with a1:  
         
  st.subheader("Our plan")
  st.image("https://banodoco.s3.amazonaws.com/3.png",use_column_width='always')
  st.write("Our plan is to create a platform and infrastructure that allows open source explorers to easily craft tools that bring their discoveries to the world.")
  st.markdown('<a href="/Plan" target="_self">Learn about our plan</a>', unsafe_allow_html=True)


with a2:    
  st.subheader("https://banodoco.s3.amazonaws.com/4.png")
  st.image("assets/4.png",use_column_width='always')
  st.write("We're sharing 100% of our ownership (aside from investment dilution) with people who contribute to OS projects that are aligned with our mission.")
  st.markdown('<a href="/Ownership" target="_self">Learn about our ownership</a>', unsafe_allow_html=True)


footer()