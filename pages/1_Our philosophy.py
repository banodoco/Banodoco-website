import streamlit as st
from ui_helpers import cta, footer, hide_fullscreen_button

hide_fullscreen_button()

with st.sidebar:
  st.write("")    
  cta()    
  
footer1, footer2 = st.columns([1.1, 1])
with footer1:  
  st.header("We want to empower tool builders who in turn empower artists")
  st.markdown("Banodoco is named after the 4 painters who assisted Michelangelo in the creation of the Sistine Chapel:")
  st.markdown("- <span style='color:red'>Ba</span>stiano da Sangallo",unsafe_allow_html=True)
  st.markdown("- Giulia<span style='color:blue'>no</span> Bugiardini",unsafe_allow_html=True)
  st.markdown("- Agnolo di <span style='color:green'>Do</span>nnino",unsafe_allow_html=True)
  st.markdown("- Jacopo del Tedes<span style='color:purple'>co</span>",unsafe_allow_html=True) 
  st.markdown("We want to empower the open source community to rethink video creation from the ground up in an AI-native manner, enabling them to build tools that equip artists with master-level assistance.")
  st.write("AI is inherently chaotic - each model can be used in wildly different ways to achieve vastly different results. These different techniques can then in turn be combined in an infinite number of ways to create an infinite number of artworks. ")

with footer2: 
  st.write("")  
  st.write("")  
  st.image("https://banodoco.s3.amazonaws.com/images/the_lads.webp", use_column_width='always')


st.write("At the cutting edge, there are talented, passionate people experimenting with each of these configurations and models - pushing the bounds of what's possible with their ingenuity.")
st.write("We believe that empowering this community to create tools that any artist can easily use is how to harness the chaotic potential of open source AI. To do this, our plan is create a tool builder and infrastucure that allows them to easily build tools that bring their discoveries and perspectives on how to leverage AI to the world.")
st.write("In doing this, we want to create an economic system that rewards people who contribute at every level, sharing both the revenue that these tools earn and ownership in our company with those who drive the ecosystem forward in various ways.")
st.write("Our ultimate goal is help the open source AI art ecosystem thrive and, in doing so, help the world understand both the beauty of AI and the power of open source:")
st.image("https://banodoco.s3.amazonaws.com/healthy-ecosystem.png",use_column_width='always')

footer()