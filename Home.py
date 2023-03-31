import streamlit as st


st.set_page_config(page_title="Banodoco")


def cta():
  st.markdown("[Visit Test App](https://ba-no-do-co.streamlit.app/)  | [Beta Test](https://github.com/peter942/banodoco) |   [Join Discord](https://discord.gg/kkjkeEaVpZ)") 

with st.sidebar:
  st.write("")    

  cta()    
  st.sidebar.markdown("*Public release: March 2023*")


header1, header2 = st.columns(2)
with header1:
  st.header("An open-source tool for crafting moving paintings with AI")
  st.write("Banodoco is a free, open-source animation tool that aims to allow anyone to use AI to create beautiful videos of anything they can imagine.")
  st.write("It's designed for those who want precision - with an approach and tools designed to give artists enough control over various AI models to create exactly what's in their imagination.")
  cta()
with header2:
  st.image("https://i.ibb.co/6wsn9j6/Untitled-design-2023-02-24-T160623-805.png",width=350)

st.markdown("***")

st.subheader("Coherent and beautiful video to video transformations")
st.write("We believe that the best way for a human to tell AI what video they want to create is with a video of their own that it transforms. Banodoco allows users to control and direct AI with pipelines that combine multiple models to achieve coherent transformations of characters, scenes, and styles.")
comparison1, comparison2 = st.columns(2)
with comparison1:
  st.image("https://banodoco.s3.amazonaws.com/input_images/input.gif", caption="Before")
with comparison2:
  st.image("https://banodoco.s3.amazonaws.com/input_images/output.gif", caption="After")         
st.info("Video prompts > word prompts. An image is worth a thousand words and a video contains 30 images per second!")

st.markdown("***")

st.subheader("AI native tools for crafting and refining your creation")
st.write("Banodoco is designed to be an AI native tool - with all of our features leveraged by AI to make your life easier. We aim to provide you with the tools to create beautiful videos with the least amount of effort possible.")
feature1, feature2, feature3 = st.columns([1,3,1])
with feature1:  
  if st.button("Timing Adjustment"):
    st.session_state['feature'] = 'timing'   
    st.experimental_rerun()
  if st.button("Key Frame Editing"):
    st.session_state['feature'] = 'frame'      
    st.experimental_rerun()
  if st.button("Scene transformation"):
    st.session_state['feature'] = 'backdrop'      
    st.experimental_rerun()
  if st.button("Custom Pipelines"):
    st.session_state['feature'] = 'pipelines'      
    st.experimental_rerun()
  st.markdown("*And much more...*")

  if 'feature' not in st.session_state:
    st.session_state['feature'] = 'pipelines'

  if st.session_state['feature'] == 'pipelines':
    feature_image = "https://banodoco.s3.amazonaws.com/input_images/Untitled+design+-+2023-02-26T150703.582.png"
    feature_text = "Use & build custom pipelines combining multiple models to achieve the exact effect you want"
  elif st.session_state['feature'] == 'timing':
    feature_image = "https://i.ibb.co/GHxJkd4/Untitled-design-2023-02-23-T220706-388.png"
    feature_text = "Adjust and tweak the timing to achieve your desired effect"
  elif st.session_state['feature'] == 'frame':
    feature_image = "https://i.ibb.co/0QNyK7K/Untitled-design-2023-02-23-T221038-734.png"
    feature_text = "Edit individual key frames with a variety of models until they're perfect"
  elif st.session_state['feature'] == 'backdrop':
    feature_image = "https://banodoco.s3.amazonaws.com/input_images/Untitled+design+-+2023-02-26T151015.293.png"
    feature_text = "Transform the backdrop of your video with a variety of models"
  

with feature2:
  st.image(feature_image)
with feature3:
  st.info(feature_text)
  
st.markdown("***")

a1, a2 = st.columns([1, 1])
with a1:
  st.write("")
  st.subheader("Become a core contributor")
  st.write("We're looking for high-agency, talented individuals who want to contribute to the project.")
  st.markdown('<a href="/Collaborate" target="_self">Learn about what we\'re looking for</a>', unsafe_allow_html=True)

   
with a2:
  st.image("https://media.discordapp.net/attachments/1017188259102724146/1078456600781652069/peteromallet_minimalistic_illustration_of_people_building_scaff_a97eb34a-7ab1-4cae-a02e-b229ff5bcb66.png")

b1, b2 = st.columns([1, 1])
with b1:
  st.subheader("Philosophy & roadmap")
  st.write("We're building an open-source tool that will enable people to make whatever they can imagine!")
  st.markdown('<a href="/Philosophy_&_Roadmap" target="_self">Learn about what we\'re looking for</a>', unsafe_allow_html=True)
  
with b2:
  st.image("https://media.discordapp.net/attachments/1017188259102724146/1078451803718438942/peteromallet_minimalistic_illustration_meaning_a_long_journey_R_5dd02f2f-1583-4f39-8eae-6348ac68062a.png")

c1, c2 = st.columns([1, 1])
with c1:
  st.subheader("Visit our gallery")
  st.write("While it's a little bit sparse now, we'll share the best creations made by artists using Banodoco.")
  st.markdown('<a href="/Gallery" target="_self">Visit Gallery</a>', unsafe_allow_html=True) 
with c2:
  st.image("https://media.discordapp.net/attachments/1017188259102724146/1078456680829960232/peteromallet_minimalistic_illustration_of_people_at_a_gallery_l_0992827a-34bf-4de1-b83d-52cc59c67d50.png")

st.markdown("***")

st.subheader("Join our Discord to learn about our releases, get early access to our beta, and to collaborate with other artists")
st.write("Join our Discord to get the latest updates and to collaborate with other artists")
cta()
