import streamlit as st

import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

st.set_page_config(page_title="Banodoco - Our philosophy")
from Home import cta, footer

hide_img = '''
<style>
button[title="View fullscreen"]{
    display: none;}
</style>
'''
st.markdown(hide_img, unsafe_allow_html=True)


with st.sidebar:
  st.write("")    
  cta()    
  
footer1, footer2 = st.columns([1.1, 1])
with footer1:  
  st.header("Empowering artists to harness the chaos of open source AI")
  st.markdown("Banodoco is named after the 4 painters who assisted Michelangelo in the creation of the Sistine Chapel:")
  st.markdown("- <span style='color:red'>Ba</span>stiano da Sangallo",unsafe_allow_html=True)
  st.markdown("- Giulia<span style='color:blue'>no</span> Bugiardini",unsafe_allow_html=True)
  st.markdown("- Agnolo di <span style='color:green'>Do</span>nnino",unsafe_allow_html=True)
  st.markdown("- Jacopo del Tedes<span style='color:purple'>co</span>",unsafe_allow_html=True) 
  st.markdown("We want to empower the open source community to rethink video creation from the ground up in an AI-native manner, enabling them to build tools that equip artists with master-level assistance.")
  st.markdown("Our goal is to ultimately empower artists to unlock the essence of creative expression: creating work that helps others see the world from their unique perspective.")

with footer2: 
  st.write("")
  
  st.write("")
  
  st.image("https://banodoco.s3.amazonaws.com/images/the_lads.webp", use_column_width='always')

st.markdown("***")

st.subheader("Our philosophy: empower tool builders to harness the chaotic beauty of open source, reward those who contribute at every level")
st.write("AI is inherently chaotic - each model can be used in wildly different ways to achieve vastly different results. These different models can then in turn be combined in an infinite number of ways to create an infinite number of outputs. ")
st.write("At the cutting edge of AI, there are talented, passionate people experimenting with each of these configurations and models - pushing the bounds of what's possible with their ingenuity.")
st.write("We believe that empowering this community to create tools that any artist can easily use is how to harness the chaotic potential of open source AI.")
st.write("In doing this, we want to create an economic system that rewards people who contribute at every level, sharing both the revenue that these tools earn and ownership in our company with those who contribute in various ways.")
st.write("Our ultimate goal is help the open source AI art ecosystem thrive and, in doing so, help the understand see the beauty of AI and the power of open source:")
st.image("https://banodoco.s3.amazonaws.com/healthy-ecosystem.png",use_column_width='always')

footer()