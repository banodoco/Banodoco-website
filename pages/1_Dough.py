import streamlit as st
from ui_helpers import cta, footer, hide_fullscreen_button

hide_fullscreen_button()

with st.sidebar:
  st.write("")    
  cta()        


h1,h2 = st.columns([1,1.5])
with h1:
    st.markdown("## :green[D]:red[o]:blue[u]:orange[g]:green[h] :red[□] :blue[□] :orange[□]")     
    st.markdown("#### A tool for unlocking the artistic potential of open source AI")
    st.markdown("Dough is a tool for making the most powerful control methods in open source AI art accessible and easy to use - starting with Steerable Motion, an approach for 'steering' videos with images!")
    
    st.markdown("If you have a powerful computer, you can run Dough locally for free. If you don't, you can use our Discord bot for a small fee.")
    st.markdown('[Get started with Dough](#get-started-with-dough)')
with h2:
    st.markdown("")
    st.markdown("")    
    st.markdown("")    
    st.markdown("")    
    st.write("")
    st.write("")
    sub1, sub2 = st.columns([1,1])    
    with sub1:
        st.image("https://banodoco.s3.amazonaws.com/dough-website/header-1.png", use_column_width=True)
    with sub2:
        st.image("https://banodoco.s3.amazonaws.com/dough-website/header-2.png", use_column_width=True)
    st.video("https://banodoco.s3.amazonaws.com/dough-website/header-video.mp4")

st.markdown("***")

st.markdown('#### Some weird, beautiful, and interesting things people have made with Dough and [Steerable Motion](https://github.com/banodoco/steerable-motion), the technology behind it')
square1, square2, square3 = st.columns([1,1,1])


with square1:
    st.video("https://banodoco.s3.amazonaws.com/dough-website/square-1.mov", format='mp4', start_time=0)
    st.link_button(url="https://twitter.com/I_Han_naH_I", label="By Hannah Submarine", use_container_width=True)


with square2:
    st.video("https://banodoco.s3.amazonaws.com/dough-website/square-2.mp4", format='mp4', start_time=0)
    st.link_button(url="https://www.instagram.com/teslanaut/", label="By Teslanaut", use_container_width=True)


with square3:
    # st.video("https://banodoco.s3.amazonaws.com/dough-website/square-3.mp4", format='mp4', start_time=0)
    st.video("https://banodoco.s3.amazonaws.com/pom.mp4", format='mp4', start_time=0)
    
    st.link_button(url="https://twitter.com/peteromallet", label="By POM", use_container_width=True)

rectangle1, rectangle2  = st.columns([1,1])

with rectangle1:
    st.video("https://banodoco.s3.amazonaws.com/dough-website/horizontal-1.mp4", format='mp4', start_time=0)
    st.link_button(url="https://twitter.com/I_Han_naH_I", label="By Hannah Submarine", use_container_width=True)

with rectangle2:
    st.video("https://banodoco.s3.amazonaws.com/plan/byarloo.mp4", format='mp4', start_time=0)
    st.link_button(url="https://www.instagram.com/byarlooo/", label="By ARLO", use_container_width=True)

    
vertical1, vertical2, vertical3 = st.columns([1,1,1])

with vertical1:
    st.video("https://banodoco.s3.amazonaws.com/dough-website/vertical-3.mp4", format='mp4', start_time=0)
    st.link_button(url="https://www.youtube.com/channel/UCDiYNmEMOtJ4bvLrzepHIDg", label="By Flipping Sigmas", use_container_width=True)


with vertical2:
    st.video("https://banodoco.s3.amazonaws.com/dough-website/vertical-2.mp4", format='mp4', start_time=0)
    st.link_button(url="https://www.instagram.com/midjourney.man/", label="By Midjourney Man", use_container_width=True)

with vertical3:
    st.video("https://banodoco.s3.amazonaws.com/plan/chris_exe.mov", format='mp4', start_time=0)
    st.link_button(url="https://www.instagram.com/syntaxdiffusion/", label="By syntaxdiffusion", use_container_width=True)


st.markdown("***")
st.markdown('#### Get started with Dough')

bottom1, bottom2 = st.columns([1,1])

with bottom1:
    st.info("##### Advanced users")
    st.image("https://banodoco.s3.amazonaws.com/advanced_users.webp", use_column_width=True)
    st.info("###### Advanced users with powerful computers can use Dough for free using our local app.")
    st.markdown('''
    - **Cost:** Free
    - **Requirements:** Linux/Windows; 16GB+ VRAM
    - **Difficulty:** Intermediate
    - **Controls:** Full
    ''')    
    st.markdown('<a href="https://github.com/banodoco/dough?tab=readme-ov-file#setup-instructions" target="_self">Find setup instructions here</a>', unsafe_allow_html=True)
    st.caption("Dough is built on top of Steerable Motion, which you can also run and build on top of [in ComfyUI](https://github.com/banodoco/steerable-motion).")
with bottom2:
    st.success("##### Everyone else")
    st.image("https://banodoco.s3.amazonaws.com/everyone_else.webp", use_column_width=True)
    st.success("###### We have an extremely powerful Discord bot that works on any device - even your phone!")
    st.markdown('''
    - **Cost:** Our costs + 60%
    - **Requirements:** Any computer or phone
    - **Difficulty:** Very easy
    - **Controls:** Intermediate
    ''')    
    st.markdown('<a href="https://discord.gg/7ykePRSufT" target="_self">Join our Discord to get started</a>', unsafe_allow_html=True)
    st.caption("We're limiting the number of new users each week - if the link isn't working, come back early next week to get access.")

st.markdown("***")

st.markdown("#### Profits are shared with the open source ecosystem")

st.markdown(''' 

This tool is the product of months of development on top of Animatediff and Stable Diffusion by the Banodoco community, a group artists, developers, and enthusiasts who are passionate about unlocking the creative potential of AI. 

We will share profits from Dough with people who contribute to the technology and movement behind it. Here's how we plan to share profits:

- 25% to the people who build infrastructure and models on which the technology is built
- 25% to people who build workflows and education materials on top of infrastructure
- 25% to artists who push the technology to its artistic limits
- 25% to the company behind this app

''')

st.markdown('<a href="/" target="_self">Learn more about Banodoco</a>', unsafe_allow_html=True)


footer()

