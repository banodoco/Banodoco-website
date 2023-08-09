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
  st.write("")    
  cta()    
  
footer1, footer2 = st.columns([1.1, 1])
with footer1:  
  st.header("An AI-native tool to assist the creation of masterpieces")
  st.markdown("Banodoco is named after the 4 painters who assisted Michelangelo in the creation of the Sistine Chapel:")
  st.markdown("- <span style='color:red'>Ba</span>stiano da Sangallo",unsafe_allow_html=True)
  st.markdown("- Giulia<span style='color:blue'>no</span> Bugiardini",unsafe_allow_html=True)
  st.markdown("- Agnolo di <span style='color:green'>Do</span>nnino",unsafe_allow_html=True)
  st.markdown("- Jacopo del Tedes<span style='color:purple'>co</span>",unsafe_allow_html=True) 
  st.markdown("We're rethinking video creation from the ground up in an-AI native manner, building models and a tool that aim to equip everyone with master-level artistic assistance.")
  st.markdown("Our goal is to help people who’ve dabbled in artistic creation with AI unlock the essence of creative expression - creating emotionally and intellectually-impactful work that helps others see the world from their unique perspective.")

with footer2: 
  st.write("")
  
  st.write("")
  
  st.image("images/the_lads.png", use_column_width='always')

st.markdown("***")

st.subheader("Our philosophy: optimising for control and a satisfying creative process")
st.image("images/philosophy_1.png",use_column_width='always')
st.write("For an artistic tool to be great, people need to be able to guide the output to match their imagination exactly and to do so in a fun, satisfying manner. ")
st.write("A good analogy for the level of control needed is a hands-on movie director like Kubrick - planning every detail, standing behind the camera, and refining each element in post-production. While every medium has its constraints, a high-degree of control given these limitations allows  artists to guide the output to the point that it can be an authentic expression of what they envision.")
st.write("Additionally, it needs to be a satisfying creative process - it has to be fun and engaging so they stay engaged as they experiment and iterate towards the final result. ")
st.write("Over the next decade, there will be many methods to produce aesthetically pleasing and technically-impressive content with AI. However, rather than focusing on novelty use-cases or non-human driven content, we want to build tools and models that are optimised for those who want to creatively express themselves authentically.  As evidenced by the craft that’s developed around prompting Midjourney, we believe that seeking control over larger works is the natural destination down the road of creative expression that many will go this century with AI - and that we can be the best tool to facilitate this progression.")

st.markdown("***")

st.subheader("How we plan to deliver this")
st.image("images/philosophy_2.png",use_column_width='always')
st.write("Our plan is to focus on helping people craft videos key-frame by key-frame - creating and manipulating the images that guide a video. Users will interact with our product using their voice or text - they'll describe what they want to happen and key frames will appear in seconds. We’ll abstract away the complexity of selecting models, writing prompts, and defining settings: people will specify what they want to happen and an LLM will create and edit key frames based on their request.")
st.write("Once they’ve defined the key frames of the project, they’ll be able to interpolate through them and apply effects - for example, to align mouth movements with audio. For the sake of speed & efficiency, the more computation-heavy video-based transformations won’t be run until after key frames have been defined.")
st.write("In addition to leveraging existing open models, we’ll create a variety of models optimised for specific purposes - our main model for version one we’ll call Steerable Motion. Steerable Motion will allow users to create motion-based key frames from a single image - for example, they’ll be able to say “make her smile and look away”, and it will generate the key frames showing this movement in seconds.")
st.write("Our approach is also designed to leverage and channel the chaos of open source. To do this, we plan to build everything in an open-source-native manner - with incentives of cash, equity, and prestige for machine learning hobbyists to create, fine-tune and refine the models.  This will allow us to get the most from the technology that exists today,  constantly evolve as models and techniques do, and spur open-source innovation in impactful directions.")

st.markdown('<a href="/Roadmap_&_collaboration" target="_self">You can learn about our roadmap here -></a>', unsafe_allow_html=True)

st.markdown("***")

st.subheader("Why & how we're building in an 'open-source native' manner")
st.image("images/open_source_native.png")

st.markdown("##### How we'll build it:")
st.markdown("- We’ll develop models in collaboration with the open-source community, creating incentives for them to explore certain areas and unlock specific capabilities.")
st.markdown("- We’ll create incentives for open source creators, apportioning the majority of our cash and equity to incentivising open source hobbyists and researchers.")
st.markdown("- We’ll make it easy for people to fork our front-end product and build on top of it.")
st.markdown("- We’ll make it easy for people to run our product on their own GPUs for free - necessary to win over the open source community and many hardcore artists.")
st.markdown("- We'll open source every model and sub-model we create so others can build on top of them.")
st.markdown("- Our product is structured in such a way that open source innovations will plug right in - though we’ll have our own core setup, as long as other models generate or edit images or videos, we’ll be completely model-agnostic.")
st.markdown("- Others will be able to plug models into our LLM - we’ll likely have a marketplace of sorts - with the LLM searching a database to make its decision, rather than models being embedded into its training.")
st.markdown("- We’ll build open source tools to power various elements of the process - like motion data collection.")
st.markdown("- We’ll pay for compute for larger training runs for proven ML engineers and promising projects.")
st.markdown("")
st.markdown("##### Why build it in this way?")

st.markdown("- **To unlock the potential in an enormous range of models and techniques:** Consider models to be like high-potential individuals, waiting for someone to inspire them to reach their potential. Unlocking the potential of a wide variety of models will be essential to us becoming an exceptional tool - for our users, it'll be like having a team of artists with a wide-range of skills available to assist them.")
st.markdown("- **To systematically leverage and channel the chaotic creativity of open-source:** We’ll channel the brilliance of thousands of talented researchers and engineers.")
st.markdown("- **To continuously evolve with the changes to models:** Models will constantly change and evolve of the next decade. If we can align the incentives of OSS contributors, we can constantly evolve with these changes.")
st.markdown("- **To attract world-class inspired talent:** I think that there are so many people who believe in the ideas behind our company - to channel the chaos of open source to create beauty - and building our company in this way will act like a magnet for these people.")
st.markdown("- **To inspire a variety of researchers to go deep into important problems:** Channeling this excitement in a direction aligned with our goals will allow ‘us’ to do far more, far more creatively than any closed-source team could.")
st.markdown("- **To build our company in a way that makes sense in a post-AI world:** I believe that - as companies can increasingly solve problems with AI that would’ve been solved with people - it’ll make sense to keep the core team as small as possible, and build with open source and project based talent, in order to implement AI solutions to problems - rather than people-based solutions.")
st.markdown("- **To build the best possible product:** I believe that this approach will allow us to build the best possible product - and that this will be the best way to build a great company.")


st.markdown('<a href="/Roadmap_&_collaboration" target="_self">You can learn about collaboration opportunities here -></a>', unsafe_allow_html=True)