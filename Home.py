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
  st.markdown("[Join our Discord](https://discord.gg/eKQm3uHKx2) | [Visit Github](https://github.com/banodoco/) |  [Get in touch](mailto:peter@omalley.io)")

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

  st.write("")
  st.write("")
  st.write("")
  st.write("")
  st.header("Create with the best of open source AI art")
  st.write("With our community, we want to create tools that help artists harness the chaos of open source AI.")
  st.write("We believe that AI can allow people to create any video they can imagine - but to unlock this potential, we must empower a community of tool-builders, who in turn empower artists.")
  
  cta()
  
with header2:

  st.write("")
  st.write("")
  st.write("")
  st.image("https://banodoco.s3.amazonaws.com/images/header_image.webp",use_column_width='always')


st.markdown("***")


a1, a2 = st.columns([1, 1])
with a1:  
  st.subheader("Our philosophy")
  st.image("https://banodoco.s3.amazonaws.com/images/philosophy_image.webp",use_column_width='always')
  st.write("We believe the way to maximise the quality of AI art is to empower open source tool-builders, who in turn empower artists.")
  st.markdown('<a href="/Our_philosophy" target="_self">Learn about our philosophy</a>', unsafe_allow_html=True)
       
with a2:    
  st.subheader("Our ownership")
  st.image("https://banodoco.s3.amazonaws.com/images/roadmap_image.webp",use_column_width='always')
  st.write("We're sharing 100% of our ownership (aside from investment dilution) with people who contribute to OS projects that are aligned with our mission.")
  st.markdown('<a href="/Ownership" target="_self">Learn about our ownership</a>', unsafe_allow_html=True)


footer()