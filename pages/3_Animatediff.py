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
  

st.header("Animatediff - building towards on a model a beautiful, flexible, and fine-tunable video model ")

st.success("Want to contribute towards building an open-source model that will allow artists to craft AI videos precisely? You can see collaboration opportunities at the bottom or join our Discord [here](https://discord.gg/nV5kF49VeY).")


st.write("Dall-E was the first time many saw coherent AI art. However, it wasn’t until Stable Diffusion 1.5 (SD) that most seeing AI art that was aesthetically beautiful and interesting:")

sd_col_1, sd_col_2, sd_col_3, sd_col_4 = st.columns([1,1,1,1])
with sd_col_1:
  st.image('https://banodoco.s3.amazonaws.com/images/stable_diffusion_1.webp')
with sd_col_2:
  st.image('https://banodoco.s3.amazonaws.com/images/stable_diffusion_2.webp')
with sd_col_3:
  st.image('https://banodoco.s3.amazonaws.com/images/stable_diffusion_3.webp')
with sd_col_4:
  st.image('https://banodoco.s3.amazonaws.com/images/stable_diffusion_4.webp')
st.write("A month ago, [Animatediff](https://animatediff.github.io/) (AD) was released. While it’s limited and hard to control - so was SD when it first launched. Despite this, I believe that AD may be SD for video - the beginning of an endless stream of improvements that result in controllable, beautiful AI video. While there have been other video approaches, I’ll cover why I think this is the right one for the community to build on top of - based on both evidence & wild speculation.")


st.markdown("### First, why did Stable Diffusion 1.5 improve so much?")

st.write("To get an idea for how much SD improved, below is a comparison of between SD 1.5 base model and Realistic Vision 5, a fine-tune based on SD1.5 - for a refresher, check out the prompt and image for each, and take a moment to observe differences in coherence, instruction-following, and aesthetics between the 2:")

st.image('https://banodoco.s3.amazonaws.com/images/realistic_vision_5.webp')

st.write("While it’s difficult to say exactly why level of improvement happened, below are probably the reasons:")

st.markdown("- Reasonably capable base model: could make pretty/interesting stuff.")
st.markdown("- Open-source: to allow people to relentlessly improve")
st.markdown("- Beautiful/aesthetically-pleasing results")
st.markdown("- Excitement/community belief: as a result of the above, the community believed in it")
st.markdown("- Extendable/Controllable: due to OSS, size, structure, etc.")
st.markdown("- Reasonably easy to build on top of")
st.markdown("- Could run on consumer GPUs")
st.markdown("- Fine-tuneable: leading to fixes for issues, an explosion of different styles/optimisations/new capabilities")


st.markdown("### Which of these characteristic does Animatediff share?")

st.markdown("##### 1) Base model/approach that can deliver beautiful but limited results:")
st.write("Examples of results:")

ad_col_1, ad_col_2, ad_col_3 = st.columns([1,1,1])
with ad_col_1:
  st.image('https://banodoco.s3.amazonaws.com/images/animatediff_example_1.gif')
with ad_col_2:
  st.image('https://banodoco.s3.amazonaws.com/images/animatediff_example_2.gif')
with ad_col_3:
  st.image('https://banodoco.s3.amazonaws.com/images/animatediff_example_3.gif')
st.write("")
st.markdown("##### 2) Strong evidence that it’s highly controllable & extendable:")
st.write("TDS_95514874 shows what it could produce with starting and ending frames - giving the user more control!")

starting_and_ending1, starting_and_ending2 = st.columns([1,1])
with starting_and_ending1:
  st.image('https://banodoco.s3.amazonaws.com/images/starting_and_ending_1.gif')
with starting_and_ending2:
  st.image('https://banodoco.s3.amazonaws.com/images/starting_and_ending_2.gif')
st.write("And here he is using ControlNet Reference to drive it:")
reference_1, reference_2 = st.columns([1,1])
with reference_1:
  st.image('https://banodoco.s3.amazonaws.com/images/reference_1.gif')
with reference_2:
  st.image('https://banodoco.s3.amazonaws.com/images/reference_2.gif')

st.write("")

st.write("And here is toyxyz showing how to control it with 2 ControlNet layers - one for the background and one for the character:")
st.image('https://banodoco.s3.amazonaws.com/images/2_layers.gif')

st.write("")

st.markdown("##### 3) Evidence that fine-tuning can fix its issues:")
st.write("This example from toyxyz using CubeyAI’s POV fine-tune shows that the background noise issue in the most popular version of AD can be fixed with fine-tuning.")
st.image('https://banodoco.s3.amazonaws.com/images/fine_tuning.gif')
st.write("This suggests that many of the negative characteristics of AD will be fixable with fine-tuning.")

st.markdown("##### 4) Reasonably easy to build on - due to building on top of the SD ecosystem:")
st.write("Builds on top of the SD ecosystem means it can use the styles, ControlNet, and more - reducing friction experimentation. All of the above examples use SD innovations and models.")

st.markdown("##### 5) Evidence that the approach for base model can be scaled:")
st.write("Meta’s Make-A-Video used a similar approach, and could generate far more complex movements than AD is capable of:")
make_a_video_1, make_a_video_2, make_a_video_3 = st.columns([1,1,1])
with make_a_video_1:
  st.image('https://banodoco.s3.amazonaws.com/images/make_a_video_1.gif')
with make_a_video_2:
  st.image('https://banodoco.s3.amazonaws.com/images/make_a_video_2.gif')
with make_a_video_3:
  st.image('https://banodoco.s3.amazonaws.com/images/make_a_video_3.gif')

st.markdown("##### 6) Growing community belief:")
st.write("From our community alone, for example, B34STW4RS is building [fine-tuners to help others refine the model](https://github.com/B34STW4RS/AD-Evo-Tuner), while Kosinkadink [is building an extension on ComfyUI](https://github.com/Kosinkadink/ComfyUI-AnimateDiff) for others to experiment with the model, while others still are figuring out how to scale the approach.")



st.markdown("### What issues does it face?")

st.markdown("##### 1) Closed-source will likely be the highly-aggressive in building on top of it:")
st.write("e.g. Kaliber.ai were the first to ship a good img2vid on top of it. Companies like them may build momentum on top of OSS innovations and scale before OSS.")

st.markdown("##### 2) Higher RAM requirements:")
st.write("Requires 16gb of RAM, - though maybe offset by affordable cloud GPU services like Lambda, Paperspace, and the fact that some functionality like interpolation can be used with lower RAM requirements.")

st.markdown("##### 3) Delivering ease-of-use:")
st.write("It’s very complex right now.")

st.markdown("##### 4) Weak base model")
st.write("Compares unfavourably to Make-A-Video - which was released a year ago.")

st.markdown("##### 5) Approach won’t scale directly")
st.write("Simply scaling up the training volume likely won’t improve the model - we’ll need more ingenuity. Thankfully there’s a lot out there from others to learn from.")



st.markdown("### Can Animatediff evolve to become the “Stable Diffusion of video”?")

st.write("This is just the beginning. Due to its characteristics, I have a high-degree of conviction people will figure out how to get longer, more coherent generations, to fix the quirks, to control videos more precisely, to get them working in a variety of motion styles, different approaches for fine-tuning motion, and endless other things that I can't even think of. I also believe we can also train larger and more coherent base models.")

st.write("This will likely require a stronger base model - but I believe that we can accrue the resources and talent to train this to a world-class level.")

st.write("In short, as happened with SD1.5, the characteristics above will mean that it'll improve to achieve things that were far beyond the base model.")

st.markdown("### If it is SD for video, what can the OSS community do to ensure they stay on top?")

st.markdown("- Allow yourself to **get excited**: if, upon reflection, you believe in the above.")
st.markdown("- Build stuff to **help others explore**: for example, as mentioned, Kosinkadink shipping the ComfyUI extension, B34STW4RS shipping the fine-tuner, and many others are doing stuff and there are many other possibilities of ways to contribute - for example, fixing the A1111 extension.")
st.markdown("- Figure out what the best directions are **f**or it: by **exploring and making stuff aggressively.**")
st.markdown("- **Aggressively build** in good directions: as it becomes obvious what delivers the most controllable/beautiful results - build stuff to reduce friction and consistency.")
st.markdown("- **Help the community understand** where this can go: share stuff that’s impressive.")
st.markdown("- **Combine efforts & repos**/collaborate/help others where possible/beneficial: fragmentation helps no one.")
st.markdown("- Build products that **bring the approaches to the mainstream:** OSS-based products from OSS companies can be as good as closed companies - and those companies will earn money from them they can plow back into OSS.")
st.markdown("- **Build orgs that can accrue resource** to train better versions: to train larger and more complex versions of this and other model.")
st.markdown("- Build orgs that **reward people who contribute w/ ownership/money**: will allow/incentivise more people to spend more time/effort contributing.")


st.markdown("### Want to help our effort to keep the best version of this open source long-term?")

st.write("I spent the past year exploring and creating AI video - [making art](https://www.youtube.com/channel/UCIPL9xW3tdiK1eql4TuxW9Q), [building a tool](http://banodoco.ai/), etc. Like many, I fell in love - both with AI art & the potential of open-source to unlock this.  If you’re reading this, I’d guess that you did too.")

st.write("To support both of these, I want to build [Banodoco](https://www.notion.so/We-re-likely-on-the-cusp-of-a-Stable-Diffusion-moment-for-video-can-we-leverage-this-opportunit-3cc2d328e45840788aaf559016b7150e?pvs=21) into an org that can ship/supports cutting edge open-source video and supporting models. Additionally, I want us to build  the best product in the world for people who wish to access and combine these models to create beautiful things.")

st.write("In order to have cash to train large models & pay contributors, we’ll aim to build a successful commercial entity that’s open to its core & gives the entirety of its ownership to people who significantly contribute. This is the most positive sum world imaginable and there’s room for many similar products/orgs too.")

st.write("Want to help us build? Follow along or get in touch [on Discord.](https://discord.com/invite/eKQm3uHKx2)")

footer()