import streamlit as st



def interpolation_element():
  interpolate1, interpolate2 = st.columns(2)

  with interpolate1:
      st.info('**Creative Interpolation**: create new video from images & motion between key frames')
      subinterpolate1, subinterpolate2 = st.columns(2)
      with subinterpolate1:
          st.image("https://banodoco.s3.amazonaws.com/images/interpolation_input_1.webp", caption="Starting point", use_column_width='always')
      with subinterpolate2:
          st.image("https://banodoco.s3.amazonaws.com/images/interpolation_input_2.webp", caption="Ending point", use_column_width='always')
      st.image("https://banodoco.s3.amazonaws.com/images/interpolation_output.gif", caption="Example from TDS_95514874", use_column_width='always')

  with interpolate2:
      st.info('**Linear Interpolation:** morph directly from one key frame to the next')
      subinterpolate1, subinterpolate2 = st.columns(2)
      with subinterpolate1:
          st.image("https://banodoco.s3.amazonaws.com/images/linear_interpolation_input_1.webp", caption="Starting point", use_column_width='always')
      with subinterpolate2:
          st.image("https://banodoco.s3.amazonaws.com/images/linear_interpolation_input_2.webp", caption="Ending point", use_column_width='always')
      st.image("https://banodoco.s3.amazonaws.com/images/linear_interpolation_result.gif", caption="Example from Google's FiLM Interpolation", use_column_width='always')


st.set_page_config(page_title="Banodoco - Home")

hide_img = '''
<style>
button[title="View fullscreen"]{
    display: none;}
</style>
'''
st.markdown(hide_img, unsafe_allow_html=True)


def cta():  
  st.markdown("[Join Discord](https://discord.gg/eKQm3uHKx2) | [Visit Github](https://github.com/banodoco/) |  [Get in touch](mailto:peter@omalley.io)")
  st.caption("Beta Versions: May 2023 -> March 2024; Version 1: launching March 2024")

def footer():
  st.markdown("***")  
  cta()



with st.sidebar:
  st.write("")    
  cta()        
  st.markdown("***")
  st.write("")

header1, header2 = st.columns(2)
with header1:
    
  st.header("Tools & models for crafting masterpieces")
  st.write("We're building an open-source tool and models designed to give artists (like you!) enough control over AI that they can create videos of anything they can imagine.")
  st.write("We want to make the best AI creative tool, and to do so in an open-source-native manner, creating alongside OSS contributors and allowing anyone to build on top of and extend our work.")
  
  cta()
  
with header2:

  st.write("")
  st.write("")
  st.write("")
  st.image("https://banodoco.s3.amazonaws.com/images/header_image.webp",use_column_width='always')

st.markdown("***")

st.subheader("Guide your creation key-frame by key-frame")
tab1, tab2, tab3 = st.tabs(["Steerable Motion", "Img2Img Transformations","Image Generations"])
with tab1:
  st.markdown('Our <a href="/Steerable_Motion" target="_self"> Steerable Motion</a> model allows artists to guide videos, key frame by key frame - creating the main images that guide a video. This allows for a fast, iterative process and a high-degree of control.', unsafe_allow_html=True)

  feature1, feature2 = st.columns([1,5])

  with feature1:  

    st.write("")
    st.write("")
    if st.button("Example #1"):
      st.session_state['feature'] = 'example_1'   
      st.experimental_rerun()
    if st.button("Example #2"):
      st.session_state['feature'] = 'example_2'   
      st.experimental_rerun()
    if st.button("Example #3"):
      st.session_state['feature'] = 'example_3'   
      st.experimental_rerun()
    
    if 'feature' not in st.session_state:
      st.session_state['feature'] = 'example_1'    
    if st.session_state['feature'] == 'example_1':
      feature_image = "https://banodoco.s3.amazonaws.com/images/example_1.webp"    
    elif st.session_state['feature'] == 'example_2':
      feature_image = "https://banodoco.s3.amazonaws.com/images/example_2.webp"    
    else:
      feature_image = "https://banodoco.s3.amazonaws.com/images/example_3.webp"
    
  with feature2:
    st.image(feature_image, use_column_width=True)

with tab2:
  img2img1, img2img2, img2img3, img2img4  = st.columns([1.5, 0.6, 1, 1])
  
  with img2img1:
    st.image("https://banodoco.s3.amazonaws.com/images/img2img_1.webp", use_column_width='always')
  with img2img2:
    st.success('''**Evolves Into ->**''')
  with img2img3:
    st.image("https://banodoco.s3.amazonaws.com/images/img2img_2.webp", use_column_width='always')
    st.image("https://banodoco.s3.amazonaws.com/images/img2img_3.webp", use_column_width='always')
  with img2img4:
    st.image("https://banodoco.s3.amazonaws.com/images/img2img_4.webp", use_column_width='always')
    st.image("https://banodoco.s3.amazonaws.com/images/img2img_5.webp", use_column_width='always')
  


with tab3:
  col1, col2 = st.columns([1, 1])
  with col1:
    st.error("Fine-tune models on unique characters & styles")
    finetune1, finetune2 = st.columns([1, 1])
    with finetune1:
      st.image("https://banodoco.s3.amazonaws.com/images/fine-tune_1.webp", use_column_width='always')
      st.image("https://banodoco.s3.amazonaws.com/images/fine-tune_2.webp", use_column_width='always')
    with finetune2:
      st.image("https://banodoco.s3.amazonaws.com/images/fine-tune_3.webp", use_column_width='always')
      st.image("https://banodoco.s3.amazonaws.com/images/fine-tune_4.webp", use_column_width='always')

  with col2:
    st.error("Choose from dozens of models from the community")
    community1, community2 = st.columns([1, 1])
    with community1:
      st.image("https://banodoco.s3.amazonaws.com/images/community_models_1.webp", use_column_width='always')
      st.image("https://banodoco.s3.amazonaws.com/images/community_models_2.webp", use_column_width='always')
    with community2:
      st.image("https://banodoco.s3.amazonaws.com/images/community_models_3.webp", use_column_width='always')
      st.image("https://banodoco.s3.amazonaws.com/images/community_models_4.webp", use_column_width='always')


st.markdown("***")


st.subheader("Bring key frames to life with Animatediff & other models for interpolation & Img2Vid")
st.markdown('We\'re building on top of <a href="/Animatediff" target="_self">Animatediff</a> and other models to bring your videos to life - you can either directly interpolate from one to the next, or creating new video between frames.', unsafe_allow_html=True)

interpolation_element()


st.markdown("***")


approach1, approach2 = st.columns([1.15, 1])

with approach1:
  st.write("")
  st.subheader("An approach for artists who want control and a satisfying creative experience")
  st.markdown("**Controllable**: artists will be able to define the motion down to a tee - think of the control a director like Kubrick or  Tarantino needs over their work  to create something that represents their imagination precisely.")  
  st.markdown("**Fast**: key frames will appear at image-diffusion speed -  making for a satisfying creative process - they can rapidly  test, iterate upon, and edit each element of the video with as much precision as they like.")  
  st.markdown("**Extendable**: artists will be able to create videos of any  length, and animate them in a variety of ways, and  use LoRAs to follow any visual style or animation style. Our approach is infinitely extendable.")

with approach2:  
  st.image('https://banodoco.s3.amazonaws.com/images/kubrick.webp')


st.markdown("***")


a1, a2 = st.columns([1, 1])
with a1:  
  st.subheader("Our philosophy")
  st.image("https://banodoco.s3.amazonaws.com/images/philosophy_image.webp",use_column_width='always')
  st.write("Optimising for control and a satisfying creative process - and open-source to our core. ")
  st.markdown('<a href="/Our_philosophy" target="_self">Learn about our philosophy</a>', unsafe_allow_html=True)
       
with a2:    
  st.subheader("Roadmap & collaboration")
  st.image("https://banodoco.s3.amazonaws.com/images/roadmap_image.webp",use_column_width='always')
  st.write("We're looking for talented, high-agency individuals who want to contribute in return for equity.")
  st.markdown('<a href="/Roadmap_&_collaboration" target="_self">Learn about our roadmap</a>', unsafe_allow_html=True)


footer()