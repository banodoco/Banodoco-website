import streamlit as st

def cta():  
  st.markdown("[Join Discord](https://discord.gg/eKQm3uHKx2) | [Visit Github](https://github.com/banodoco/)")

def footer():
  st.markdown("***")  
  cta()

def hide_fullscreen_button():
    hide_img = '''
    <style>
    button[title="View fullscreen"]{
        display: none;}
    </style>
    '''
    st.markdown(hide_img, unsafe_allow_html=True)
