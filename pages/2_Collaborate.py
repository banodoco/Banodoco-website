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



st.title("Contribute")
st.write("In addition to public contributors wants we release, we'd want to deeply collaborate with brilliant people, who believe in our mission, and believe in the power of open source.")
st.write("Everything you build will not only be open source as part of Banodoco, but will ideally but delivered in a modular way for others to easily use. For example, this means that any models created or optimised will be hosted on Replicate.com for others to easily leverage, while front-end components developed will be built as Streamlit components for others to implement.")  

st.subheader("What we're looking for")
st.markdown("We're looking for high-agency, talented individuals who want to take ownership over various components of the project. Below are what we're looking for right now..")
with st.expander("Optimise existing models to make them practical for usage (ML Engineer)"):
  st.write("There are a lot of useful models out there that are either too slow or have other barriers to be usable by Banodoco. We're looking for someone to help us optimise these models to make them practical for usage.")
  st.markdown("Are you interested? Just send an email to me [here](mailto:peter@omalley.io?subject=Help%20optimising%20Banodoco%20models%20(%23BanodocoML)&body=Hi%2C%20my%20name%20is%0D%0A%0D%0ASomething%20I've%20done%20before...%0D%0A%0D%0AI'm%20interested%20because...%0D%0A%0D%0ATag%3A%20BanodocoMLOptimiser) and I'll get back if it seems like a good fit")
with st.expander("Build out front-end components to improve editing process (JavaScript/Front-End)"):
  st.write("We're looking for someone to help us build out front-end components to improve the editing process. This could include things like a better way to select keyframes, or a better way to pan the camera.")
  st.markdown("Are you interested? Just send an email to me [here](mailto:peter@omalley.io?subject=mailto:peter@omalley.io?subject=Help%20with%20Banodoco%20Front-End%20&body=Hi%2C%20my%20name%20is%0D%0A%0D%0ASomething%20I've%20done%20before...%0D%0A%0D%0AI'm%20interested%20because...%0D%0A%0D%0ATag%3A%20BanodocoFrontEnd) and I'll get back if it seems like a good fit")
with st.expander("Build a small model for automated key frame selection (ML)"):
  st.write("We're looking for someone to help us build a small model for automated key frame selection. This could be as simple as a model that takes in a video and outputs a list of key frames. Figuring out how to get the data do this will be a big part of the project :)")
  st.markdown("Are you interested? Just send an email to me [here](mailto:peter@omalley.io?subject=mailto:peter@omalley.io?subject=mailto:peter@omalley.io?subject=Help%20with%20Banodoco%20ML&body=Hi%2C%20my%20name%20is%0D%0A%0D%0ASomething%20I've%20done%20before...%0D%0A%0D%0AI'm%20interested%20because...%0D%0A%0D%0ATag%3A%20BanodocoML) and I'll get back if it seems like a good fit")
with st.expander("Build out automated scenery/backdrop panning tool (Python)"):
  st.write("We're looking for someone to help us build out an automated scenery/backdrop panning tool. This will initially start as a tool that takes user input and generates backdrops based on user input (prompts or images) but should be built to evolve into an automated tool. I have a bunch of ideas on how to do this.")
  st.markdown("Are you interested? Just send an email to me [here](mailto:peter@omalley.io?subject=Help%20with%20Banodoco%20Backdrop%20Python%20project&body=Hi%2C%20my%20name%20is%0D%0A%0D%0ASomething%20I've%20done%20before...%0D%0A%0D%0AI'm%20interested%20because...%0D%0A%0D%0ATag%3A%20BanodocoPythonProject) and I'll get back if it seems like a good fit")
with st.expander("Refine and optimise structure and speed of app (Python)"):
  st.write("I'm a software development noob and I'm sure there are a lot of ways to improve the structure and speed of the app. I'm looking for someone to help me with this.")
  st.markdown("Are you interested? Just send an email to me [here](mailto:peter@omalley.io?subject=Help%20with%20Banodoco%20Backdrop%20Optimisation%20project&body=Hi%2C%20my%20name%20is%0D%0A%0D%0ASomething%20I've%20done%20before...%0D%0A%0D%0AI'm%20interested%20because...%0D%0A%0D%0ATag%3A%20BanodocoPythonOptimiser) and I'll get back if it seems like a good fit")
with st.expander("Other stuff you think of (???)"):
  st.write("Maybe you can think of something else that would be useful to the project. If so, let me know!")
  st.markdown("Are you interested? Just send an email to me [here](mailto:peter@omalley.io?subject=Help%20with%20%3F%3F%3F&body=Hi%2C%20my%20name%20is%0D%0A%0D%0ASomething%20I've%20done%20before...%0D%0A%0D%0AI'm%20interested%20because...%0D%0A%0D%0ATag%3A%20BanodocoQuestionMark) and I'll get back if it seems like a good fit")

