import streamlit as st
from ui_helpers import footer, hide_fullscreen_button, cta

hide_fullscreen_button()

with st.sidebar:
  st.write("")    
  cta()      

st.header("Videos made with earlier versions of our tool:")

# Define the function to display each item.
def display_gallery_item(title, produced, video_link, software_version):
    st.info(f"##### {title}")
    st.caption(f"*Produced **{produced}** with **Banodoco v {software_version}***")
    st.video(video_link)    
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