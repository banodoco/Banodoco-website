import streamlit as st

import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from Home import cta,footer

st.set_page_config(page_title="Banodoco - Gallery")

hide_img = '''
<style>
button[title="View fullscreen"]{
    display: none;}
</style>
'''
st.markdown(hide_img, unsafe_allow_html=True)

with st.sidebar:      
  cta()    
  
st.title("Gallery")

st.write("You can see videos made with earlier versions of Banodoco below.")

# Define the function to display each item.
def display_gallery_item(title, produced, video_link, software_version):
    st.markdown(f"#### {title}")
    st.write(f"Produced: {produced}")
    st.video(video_link)
    st.info(f"Made with: Banodoco v {software_version}")
    st.markdown("***")

# Define the function to create rows and call the display function.
def display_gallery_row(*items):
    # Always create two columns
    columns = st.columns(2)
    
    for idx, item in enumerate(items):
        with columns[idx]:
            display_gallery_item(**item)


# Data structure for gallery items.
gallery_items = [
    {
        "title": "The sound of the tires in the snow #2",
        "produced": "February 2023",
        "video_link": "https://youtu.be/vWWBiDjwKkg",
        "software_version": "0.2"
    },
    {
        "title": "The sound of the tires in the snow #1",
        "produced": "December 2022",
        "video_link": "https://youtu.be/X_BLuno7C84",
        "software_version": "0.1"
    },
    {
        "title": "Go all the way",
        "produced": "March 2023",
        "video_link": "https://www.youtube.com/watch?v=M2AK22oZH6k",
        "software_version": "0.2"
    },
    {
        "title": "Eyes",
        "produced": "May 2022",
        "video_link": "https://www.youtube.com/watch?v=O1AKP8Ce_X8",
        "software_version": "0.0.1"
    },
    {
        "title":"Without Humanity - feat. David AI-ttenborough",
        "produced":"June 2023",
        "video_link":"https://www.youtube.com/watch?v=PNFjIJdNipQ",
        "software_version":"0.3"

    }
]

# Display items in the gallery.
display_gallery_row(gallery_items[0], gallery_items[4])
display_gallery_row(gallery_items[2], gallery_items[3])
display_gallery_row(gallery_items[1])


footer()