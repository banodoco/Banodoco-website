import streamlit as st

import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from Home import cta

with st.sidebar:
  st.write("")    
  cta()    


st.header("How we'll build towards a product that delivers fast, steerable & beautiful animation")

st.markdown('''
<style>
ul.stMarkdown ul, ul.stMarkdown li {
    padding-left: 20px;
    margin-bottom: 0 !important;
}
</style>
''', unsafe_allow_html=True)



st.markdown("The three building blocks of delivering this are below:")

st.markdown("##### 1. Transformation Models")
st.markdown("- **Steerable Motion:** a model that creates key frames for the main movement of a video from a base image")
st.markdown("- **Interpolation Models:** models that fill the gap between these key frames, to create a full motion effect")
st.markdown("- **Supplementary Models:** models to achieve a range of image and video creations and transformations")
st.markdown("##### 2. Creative Assistant Model")
st.write("An LLM and routing system that understands user requests and directs them to a range of transformation models")
st.markdown("##### 3. Steering User Interface")
st.write("A beautiful and simple UX where users can input simple instructions, and rapidly see results")


st.markdown("***")


st.markdown("### How they'll work together")
st.write("Users will interact with the **Steering User Interface** - with the **Creative Assistant Model** understanding their request, creating the main motion using the **Steerable Motion** model, and then bringing this to life and editing it using the **Interpolation and Supplementary Models.**")
st.write("You can see an overview of how they might interact in the diagram below - I suggest you read from left to right, starting from the user instruction text in and following the arrows to the bottom and then back up to the text:")
st.image("https://banodoco.s3.amazonaws.com/images/flowchart.webp", use_column_width=True)


st.markdown("***")


st.markdown("### How we'll build towards them")
st.write("Our goal is to ship a great version 1 of our full product experience by **March of 2024**.")
st.write("Below are the components:")
st.markdown("##### May -> August: Ship Research Product v. 1.0")
st.write("We're building towards a product on top of Streamlit that will act as a 'Research Product'. It's a minimalistic but powerful interface for us and others to use to test and refine our models, and create using our approach. You can check out the repo for this here, and run it locally, but his is currently pre-beta. We'll be refining it and launching a hosted web-app soon.")
st.markdown("**Collaboration opportunities:**")
st.write("- Help get this running on local GPUs: we're using Replicate's [COG](https://github.com/replicate/cog) to run the models. This means that we're using Replicate API to run the hosted version, but our approach will allow people to run them locally. However, this is currently not set up but should be possible with a few day's work. Get in touch on Discord if you'd like to help with this.")

st.markdown("--")

st.markdown("##### July -> February: Work towards Steerable Motion v. 1.0")
st.write("You can read more about Steerable Motion and collaboration opportunities **here**.")

st.markdown("--")

st.markdown("##### October -> March: Work towards Img+Img2Vid Models for Creative Interpolation")
st.write("We will aim to provide a number of interpolation models in our first version. Depending on a number of factors, we may train our own model - but worst case, we will seek to adapt and fine-tune existing text2vid models for this purpose.")
st.markdown("**Collaboration opportunities:**")
st.write("- ML Engineers/Architect: to help explore approaches to training our own models.")
st.write("- Fine-tuners: to figure out how to optimise existing models.")

st.markdown("--")

st.markdown("##### September -> March: Build Towards Creative Assistant LLM v. 1.0")
st.write("The creative assistant LLM will take high-level user instructions and translate them into queries to a variety of models. The goal is to abstract unnecessary complexity away from most users, while also allowing advanced users to tweak every knob.")
st.markdown("**Collaboration opportunities:**")
st.write("- LLM Tinkerers/Engineers: to explore fine-tuning Llama2 and other models to suit this purpose.")

st.markdown("--")

st.markdown("##### September -> March: Work towards Production UX v. 1.0")
st.write("The product will be voice or text driven - users will describe what they want and it’ll query the LLM to decide what models to use to create new frames or edit existing ones.")
st.markdown("**Collaboration opportunities:**")
st.write("- Designer/UX Engineer: we're looking for a brilliant designer/UX engineer who wants to take the lead on designing and building towards version one of our product.")


st.markdown("***")


st.markdown("### How & why to contribute")
st.write("We’re currently a bootstrapped company. While we plan to raise funding, that means collaborators right now will be paid in equity.")
st.write("We have an exciting direction and, based on Midjourney's commercial success, we think it can be a great business. However, equity in any startup is obviously inherently a gamble.")
st.write("If you're interested at this stage, I would encourage you to only do this is you’d do it purely for the fun of it and because you think your work can be impactful.")
st.write("If you contribute significantly, you will get equity (pre-agreed in advance) that will be worth a significant amount if we're successful. As a result, we will ask you to take your work seriously if you do contribute significantly. This is a reasonably large project with a large number of moving parts - those who contribute components will have others depending on their work.")
st.write("When we raise funding, we plan to compensate significant contributors, in addition to bringing on-board full-time, long-term collaborators. If you're interested in any of the above projects, please **join our Discord [here](https://discord.gg/eKQm3uHKx2)** to see more details.")

