import streamlit as st

import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from Home import cta,interpolation_element,footer


hide_img = '''
<style>
button[title="View fullscreen"]{
    display: none;}
</style>
'''
# st.markdown(hide_img, unsafe_allow_html=True)

with st.sidebar:
  st.write("")    
  cta()    
  

st.header("Steerable Motion - a model for controlling AI video generation")

st.success("Want to contribute towards building an open-source model that will allow artists to craft AI videos precisely? You can see collaboration opportunities at the bottom or join our Discord [here](https://discord.gg/nV5kF49VeY).")

st.write("Steerable Motion is a model for creating motion key frames from an image based on user instructions. Our goal is that a user can say what they want to happen 'after' an image, and Steerable Motion creates images showing what happens by evolving the input image.")
st.write("To do this, we're training a model (early versions below) on motion key frames - pairs of images -  alongside a description of the difference between them.")
st.write("The purpose is to allow people to rapidly create and iterate upon key frames of videos which will in turn guide 'full' video generations:")
st.image('https://banodoco.s3.amazonaws.com/images/motion.webp')
st.write("They can iterate through different possibilities:")
st.image('https://banodoco.s3.amazonaws.com/images/iteration.webp')
st.write("And because they only generating images, they can see the results in **seconds**:")
st.image('https://banodoco.s3.amazonaws.com/images/changes.webp')
st.write("These images can then be used to 'guide' a video generation - using classical interpolation, or video models prompted with 2 images:")
interpolation_element()
st.write("The goal is to give artists for a high-degree of control over videos - with them defining the main movements as precisely as they like - and a fun, fast, interactive creative process - with the ability to see and iterate upon elements in seconds. Our approach aims to work for minor changes (facial expression changes, etc.) and major ones (large movements, perspective changes) while maintaining consistency - in order to give artists as precise or as broad control as they desire.")


st.markdown("***")


st.markdown("### Our approach for v.1.0: fine-tuning Stable Diffusion on motion data")
st.write("For version 1, we plan to fine-tune Stable Diffusion on key frame pairs, alongside a description of the change between them.")
st.write("From architecture, to collecting training data, there are a wide variety of different ways to approach various elements of this. In order to unlock the best possible approach, we plan to build this model in public in collaboration with the open source community - creating incentives and inspiration for open-source engineers and fine-tuners to work with us to crack elements of it.")

st.markdown("##### v.0.1: fine-tuning motion key frames from a single character on base SD1.5:")
st.info("**SHIPPED - July 2023**: you can see the code [on Github](https://github.com/banodoco/steerable-motion), download the model [on HuggingFace](https://huggingface.co/peteromallet/steerable-motion), and examples of outputs below.")
st.write("For 0.1, I wanted to validate the fundamental approach. To do this, I fine-tuned Stable Diffusion 1.5 on pairs of key frames, alongside a description of the difference between them.")
st.write("For the sake of speed, I focused on a single character - the assumption is that, with a large, diverse training set, the approach will generalise - as similar approaches like [InstructPix2Pix](https://www.timothybrooks.com/instruct-pix2pix/) have.")
st.write("The initial validation worked - I could generate small movements (facial expressions) and medium movements (body movements).")
st.write("You can see examples of the output here:")

outputcol1,outputcol2 = st.columns([1,1])
with outputcol1:
  st.image('https://banodoco.s3.amazonaws.com/images/steerable-motion-output_1.webp')
with outputcol2:
  st.image('https://banodoco.s3.amazonaws.com/images/steerable-motion-output_2.webp')

st.markdown("--")

st.markdown("##### v.0.1 -> 0.3 scaling data-collection, experimenting with different architectures, seeking generalisation, switching to a fine-tune & figuring out instructions:")
st.info("**IN PROGRESS - August -> September 2023**: see collaboration opportunities below.")
st.write("As a next step, we'll seek to scale data-collection in order to demonstrate generalisation, and make the output more coherent.")
st.write("My feeling is that high-quality data is very important so we’ll need to figure out how to curate that at a large scale - probably by building a system that leverages BLIP2, Segment Anywhere, and others, as well as by leveraging existing video datasets. I’ve built an early version of this tool **here**.")
st.write("Additionally, we'll experiment with a range of data types and instructions and switch to training on top of a good general base like Realistic Vision. We'll also experiment with different architectures and approaches.")

st.markdown("--")

st.markdown("##### v.0.3 - 0.7: training on SDXL, working towards larger movements, and figuring out an approach to achieve multi-frame consistency:")
st.info("**PENDING - September -> November 2023**")
st.write("We plan to lock in the architecture and demonstrate the fundamentals on a SD1.5-based models. However, we expect that the results will improve significantly on SDXL - given its superiority at instruction following - so we’ll switch to that. ")
st.write("We’ll also figure out an approach for large movements and other approaches to achieve multi-frame consistency - for example, one approach that may help is training on multiple input key frames - 2 frames instead of one - but there are many others that will contribute towards consistency.")

st.markdown("--")

st.markdown("##### v.0.7 -> 1.0: scaling towards a strong v.1 of a motion-model")
st.info("**PENDING - January -> Febuary 2024**")
st.write("We’ll continue to optimise, scale data-collection, and then build towards a strong version 1.0.")

st.markdown("--")

st.markdown("##### v.1.0 onwards")
st.write("The architecture and approach for Steerable Motion will evolve significantly for the next versions - probably with our own base model.")


st.markdown("***")


st.markdown("### Collaboration Opportunities:")
st.write("We're seeking open-source collaborators who want to assist:")
st.markdown("- Explore different architectures/approaches")
st.markdown("- Explore approaches to prompting")
st.markdown("- Building a distributed, highly-automated data-collection process using Segment Anywhere & BLIP2.")
st.markdown("- Explore repurposing different data-sets")
st.markdown("- Explore approaches to create multi-key frame stability - training on 2 input frames, etc.")
st.markdown("- Getting the approach working with SDXL")
st.markdown("- Other stuff you may think of")
st.markdown("If you're interested in helping out in large or small ways, you can find more details on our Discord [here](https://discord.gg/nV5kF49VeY).")
st.write("While we're bootstrapped right now, we're allocating up to 0.5% of equity per month for the next 6 months for open-source contributors who contribute significantly.")


footer()