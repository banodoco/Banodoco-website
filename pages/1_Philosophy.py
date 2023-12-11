import streamlit as st
from ui_helpers import cta, footer, hide_fullscreen_button

hide_fullscreen_button()

with st.sidebar:
  st.write("")    
  cta()    
  
footer1, footer2 = st.columns([1.1, 1])
with footer1:  
  st.write("")
  st.header("We want to empower tool builders who in turn empower artists")
  st.markdown("Banodoco is named after the 4 painters who assisted Michelangelo in the creation of the Sistine Chapel:")
  st.markdown("- <span style='color:red'>Ba</span>stiano da Sangallo",unsafe_allow_html=True)
  st.markdown("- Giulia<span style='color:green'>no</span> Bugiardini",unsafe_allow_html=True)
  st.markdown("- Agnolo di <span style='color:orange'>Do</span>nnino",unsafe_allow_html=True)
  st.markdown("- Jacopo del Tedes<span style='color:blue'>co</span>",unsafe_allow_html=True) 
  st.write("AI has the potential to give every individual master-level artistic assistance. However, it is also inherently chaotic - each model can be used in vastly different ways to achieve wildly different results - think of each of them as a prodigy, bursting full of potential that they may or may not reach - depending on the instruction, structure, and inspiration that they receive.")

with footer2: 
  st.write("")  
  st.write("")  
  st.image("https://banodoco.s3.amazonaws.com/images/the_lads.webp", use_column_width='always')


st.write("At the cutting edge, there are talented, passionate people experimenting with these models - pushing the bounds of what's possible with their ingenuity - discovering control methods, optimal settings, and combining them with other models. However, their work is often lost - inaccessible to those without technical knowledge, or buried in the depths of Github repos.")
st.write("We believe that empowering this community of explorers to create tools that any artist can use is how to harness the chaotic potential of open source AI. To do this, our plan is to create a tool builder and infrastructure that allows them to easily craft tools that bring their discoveries to the world.")
st.write("We believe that the capabilities of thousands of these tools - each the product of deep domain expertise - combined with the creativity of artists, will allow anyone to create any video we can imagine - especially as models evolve and become more powerful.")
st.write("In doing this, we want to create an economic system that rewards people who contribute at every level, sharing both the revenue that these tools earn and ownership in our company with those who drive the ecosystem forward in various ways.")
st.write("Our ultimate goal is help the open source AI art ecosystem thrive and, by contributing to a thriving ecosystem, help the world understand both the beauty of AI and the power of open source:")
st.write("")
st.image("https://banodoco.s3.amazonaws.com/healthy-ecosystem.png",use_column_width='always')

footer()