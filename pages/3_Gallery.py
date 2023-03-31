import streamlit as st

import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from Home import cta

hide_img = '''
<style>
button[title="View fullscreen"]{
    display: none;}
</style>
'''
st.markdown(hide_img, unsafe_allow_html=True)

with st.sidebar:      
  cta()    
  
st.title("Gallery")



gallerya1, gallerya2 = st.columns([1, 1])

with gallerya1:
  st.markdown("#### The sound of the tires in the snow #2")
  st.write("Produced: Febuary 2023")
  st.video("https://youtu.be/vWWBiDjwKkg")
  st.info("Made with: Banodoco v 0.2")
  st.markdown("***")

with gallerya2:
  st.markdown("#### The sound of the tires in the snow #1")
  st.write("Produced: Decemeber 2022")
  st.video("https://youtu.be/X_BLuno7C84")
  st.info("Made with: Banodoco v 0.1")
  st.markdown("***")
  
galleryb1, galleryb2 = st.columns([1, 1])

with galleryb1:
  st.markdown("#### Go all the way")
  st.write("Produced: March 2023")
  st.video("https://www.youtube.com/watch?v=M2AK22oZH6k")
  st.info("Made with: Banodoco v 0.2")
  st.markdown("***")