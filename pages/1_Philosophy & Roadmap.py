import streamlit as st

st.set_page_config(page_title="Banodoco")

hide_img_fs = '''
<style>
button[title="View fullscreen"]{
    display: none;}
</style>
'''

st.markdown(hide_img_fs, unsafe_allow_html=True)


def cta():
  st.markdown("[Visit Test App](https://ba-no-do-co.streamlit.app/)  | [Beta Test](https://github.com/peter942/banodoco) |   [Join Discord](https://discord.gg/kkjkeEaVpZ)") 

with st.sidebar:
  st.write("")    

  cta()    
  st.sidebar.markdown("*Public release: March 2023*")



header1, header2 = st.columns([1, 1])
with header1:  
  st.subheader("A open-source tool to assist those who want to create beautiful things")
  st.write("Banodoco is named after the 4 painters who assisted Michelangelo in the creation of the Sistine Chapel. We believe that AI can provide everyone in the world with expert assistance to make their masterpieces come to life.")
with header2:
  st.image("https://i.ibb.co/bJmHHXj/Untitled-design-2023-02-24-T013745-519.png", use_column_width='always')

st.subheader("Our Principles")
st.markdown("**For the creation of beautiful things**")
st.write("In a world where everyone can easily create beautiful things, everything will become increasingly beautiful - so we’re focused on helping people create things that are")
st.markdown("**For people who want control**")
st.write("Some tools create beautiful things - but the people who use them have limited control. We want humans to be in the driver’s seat.")
st.markdown("**Lean on humans where AI falls short**")
st.write("We believe that AI can assist humans in creating beautiful things, but that humans will always be needed to make the final decisions.")
st.markdown("**Work to automate the mundane**")
st.write("We want to automate the mundane tasks that are required to create beautiful things, so that humans can focus on the creative tasks.")
st.markdown("**Be structurally model agonistic**")
st.write("We’ll use whatever models deliver the best results and build our tool in a way that makes it easy for others to add their own models.")
st.markdown("**Open to our core**")
st.write("Everything we do will be open for anyone to use for free (minus GPU costs) or for anyone to build on top of.")
st.markdown("**Hosted to ease access**")
st.write("While anyone can use the free version, we’ll have a hosted version available at cost of compute + 10-30%. Any profits from this will be distributed to collaborators based on a pre-defined system.")

st.write()
