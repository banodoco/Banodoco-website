import streamlit as st
from ui_helpers import cta, footer, hide_fullscreen_button

hide_fullscreen_button()

with st.sidebar:
  st.write("")    
  cta()    
  
st.header("Our community")

st.write("With our community, we're aiming to build a micro-representation of a thriving open source AI ecosystem - one where the different groups learn from and are inspired by one another:")
st.image("https://banodoco.s3.amazonaws.com/plan/ecosystem.png",use_column_width='always')
st.write("We're nurturing an environment where talented, passionate engineers, inventors and artists openly discover, build and learn together, and are rewarded for doing so. Our goal is to build it into a little slice of the future we want to see.")
# https://discord.com/invite/eKQm3uHKx2
st.markdown("If you're curious, you can join our Discord [here](https://discord.com/invite/eKQm3uHKx2).")


footer()
