import streamlit as st
import pandas as pd
from ui_helpers import cta, footer, hide_fullscreen_button

hide_fullscreen_button()

with st.sidebar:
  st.write("")    
  cta()    
  
st.header("A plan to help the open source AI art ecosystem thrive and build a tiny piece of the 2nd Renaissance")

with st.expander("tl;dr", expanded=True):
  st.info('''  
  Our goal with Banodoco is to create a tool-builder and infrastructure that allows anyone to easily craft, ship and monetise artistic tools that combine workflows, models, and creative flows in a multitude of unique ways. We believe that we can help nurture an ecosystem that produces thousands of extraordinary tools, each targeted at different groups and subcultures.

  However, that's a broad expansive, vision that will require significant resources to pursue, so we aim to demonstrate it with our first tool, [Dough](https://banodoco.ai/Dough). Dough is a local app and Discord bot for steering videos using batches of images, and we will also have a web app soon. It's powered by [Steerable Motion](https://github.com/banodoco/steerable-motion), a technique we pioneered for driving animations with batches of images.

  These tools and capabilities are the product of extensive effort from hundreds of people in our community over the past nine months - building on top of and extending the capabilities of [Animatediff](https://animatediff.github.io/), an open source video model.

  Our long-term mission is to drive the open source AI art ecosystem and build an economic engine for it - by creating an entity that profits off of it thriving. We believe that if we can create an economic system that benefits from and incentivises openness, this ecosystem will grow - and we can build an extremely successful business that everyone who contributed significantly [will own a part of](https://banodoco.ai/Ownership).

  ''')






st.markdown("### History of Animatediff, Banodoco, and potential of the open source ecosystem")
st.write("""

I spent the past 18 months working on open source AI video - my original goal had been to make a video for [my favourite poem](https://x.com/pom_I_moq/status/1784547394824110121) but this led me down a deep and weird rabbit hole that consumed most of my waking hours since them.        

For the first 9 months, I was working alone, trying to learn what art was from the ground up and how to wrangle AI models to make it. I was making progress but it was slow and I held back by the lack of community work in video.         
         
However, in July of 2023, a new video model, Animatediff, was released. Though it could create just 16 frames by default with no ability to control the motion, it was built on top of Stable Diffusion 1.5 and could run on local GPUs - which meant that the community would be able to extend it.
         """)




st.write("""
I took to Reddit and Twitter [to explain its potential from my perspective](https://tiny-galleon-600.notion.site/Is-Animatediff-Stable-Diffusion-for-video-c0457b197d3045e09738754609e1dc6d?pvs=4), and began to bring together most of the people who were building on top of it.
         
Since then, our community has grown and become a hub for open source video efforts, with the people there at the cutting-edge of building infrastructure, training open models, and creating ambitious art - all while collaborating openly and learning from one another. 
         
As an example of the progress, here's what the model could do by default when it was released:""")
         
st.video('https://banodoco.s3.amazonaws.com/plan/animatediff.mp4')    

st.write("""

While here was an early effort at using it for interpolation - travelling between images - just one area of progress:
         
""")

st.video('https://banodoco.s3.amazonaws.com/plan/early_interpolation_progress.mp4')    

st.write("""
While here's progress in interpolation after 4 months - the product of effort, insights and support from a bunch of people:
         """)


st.video('https://banodoco.s3.amazonaws.com/plan/4_months_interpolation_progress.mp4')    

st.write("""
         
And here's progress after 10 months - while this is a slightly updated version of the model, it can still only do 16 frames - this progress is mostly due to people figuring out stuff on top of it and combining it with other models:
         
         """)
         
st.video('https://banodoco.s3.amazonaws.com/plan/final_interpolation_progress.mp4')    


st.write("""
         

It's been extraordinary to watch this unfold in real-time - to see work, insights, and art lead to the output of the community becoming better and better. And this is just one example - there are many other areas. You can read more about this progress [here](https://tiny-galleon-600.notion.site/Animatediff-Progress-1) and visit our [our Twitter account](https://twitter.com/banodoco) to see some of the art the community has been creating.""")
         
         
st.write("""
         
         Observing it all in action, I realised that what we had was a micro-representation of the larger open source AI ecosystem. Looking at AI ecosystems from an external perspective, you could be forgiven for thinking that those who train the models are the only essential component but spending time in our community shows how much this perspective misses - anything good that comes from open source AI art ecosystem is the product of a whole ecosystem working together - from model creators, to experimenters, to infrastructure builders - to ultimately deliver artistic tools and art.

If you've spent any time in our Discord, you've probably seen something like this diagram I've shared trying to explain this:
""")

st.image('https://banodoco.s3.amazonaws.com/plan/ecosystem.png')

st.write("""
While I think our representation of this micro-ecosystem performs quite well in many ways, open source ecosystems can also be dysfunctional for a variety of reasons. 

For example, the people who participate in them might move in wildly incoherent directions, they frequently make things that are useless to others, or they might just not share what they create. Many others who appreciate the output of the ecosystem don't contribute because they have no inspiration, culture, or incentive compelling them to.
""")

st.image('https://banodoco.s3.amazonaws.com/plan/broken-ecosystem.png')

st.write("""
There can also be external factors that cause ecosystems to perform poorly - for example, people might be demoralised due to closed-source companies making money from their work while they don’t, or other companies may pay participants to do work that remains closed-source.

Additionally, over the coming years, there may be external factors in the world pushing AI as a whole towards being less and less open:
""")

st.image('https://banodoco.s3.amazonaws.com/plan/external-impact.png')

st.write("""
A confluence of these factors - and closed models becoming significantly better than open ones - may result in the ecosystem floundering. As a result, it may become a demoralising, uninspiring place for people to expend effort, which will result in fewer people contributing with less enthusiasm.

That said, it's also possible that the opposite happens: that it becomes a _thriving_ ecosystem. This ultimately comes down to individuals participating in this ecosystem doing meaningful work and feeling fulfilled and rewarded for doing so.

A thriving ecosystem will attract talent, resources, and energy, and, as a result, artists and consumers will have better tools for creation.

This will lead to more artists feeling empowered by the tools they have and more beautiful AI art being created. To me, this feels overwhelmingly positive and utopian - we should want a thriving AI art ecosystem and aspire to build towards one!
""")

st.image('https://banodoco.s3.amazonaws.com/plan/floundering-vs-thriving.png')

st.markdown("### What are the components of a thriving ecosystem?")
st.write("""

There are many functional ecosystems, but I’m going to speculate on what the components of a thriving one might be - one in which huge amounts of energy is being created and channeled into productive places by a large number of talented and inspired people:

- **Tools to power the ecosystem:** a thriving ecosystem requires tools that enable people at various levels - tools like Comfy unlock others to be able to fulfill their role and effectively collaborate.
- **Support for infrastructure builders:** a thriving ecosystem requires people building infrastructure, and they need to be supported to do so sustainably.
- **Education for contributors and active participants:**  access to high-quality education allows members of the public to work their way towards becoming active contributors at the deepest levels.
- **Open models made for the community with fully permissible licences:** many models aren’t created to be built on top of, with approaches that make interoperability difficult or licences that deter builders. A thriving ecosystem requires fully open models that are created for others to build on top of - and are funded in a sustainable manner.
- **Incentives to encourage openness among various participants:** there will be many incentives pushing the ecosystem closed - these need to be counteracted with incentives to keep things open.
- **A community of builders supporting and driving each other:** people building technology that empowers others having a community of others who are doing similarly pushes everyone to be at their best.
- **Artists who are pushing techniques and technology to its limits**: artists who create extraordinary work inspire the public on what AI art can do and attract more ecosystem participants.
- **Economic models that benefit from openness:** in the world today, capitalism is the best means for incentivising people and acquiring capital for large projects - economic models that benefit from openness allow will allow the ecosystem to grow and thrive.
- **Fairness & ownership:** people derive economic benefit from the ecosystem - in a thriving ecosystem, the people who contribute to this would also share in this benefit. Humans have a deep, built-in sense of fairness - to enthusiastically particpat in an ecosystem, they need to feel that as though will be rewarded fairly for their efforts.
""")

st.markdown("### One part that’s missing from our ecosystem: open source commercial consumer tools that bring the output of the ecosystem to the public - and whose success benefits the ecosystem")
st.write("""
A fairly predictable trend is emerging in the AI art ecosystem:  people in the open source community come up with interesting and unique technology, artistic approaches and styles. These innovators - using the products of the ecosystem - invent and discover extraordinary things and share it all openly with the world. However, they typically share it in such a way that it’s only accessible to a tiny subsection of advanced users via Comfy workflows and Github repos. 

If it’s successful in this group, that’s when things get disjointed: a closed source company typically implements their work, refines their invention and brings it to the world.

This is problematic for several reasons. First, the companies who implement them obviously make a lot of money from these innovations, while the original creators and ecosystem that supported them don’t get anything. Money that could allow the inventors to spend more time doing open source work, and that could fund the ecosystem as a whole, goes to closed-source companies to invest in more closed-source technologies.
""")

st.image('https://banodoco.s3.amazonaws.com/plan/booooooooo.png')

st.write("""
However, it’s not just about money - it’s also about all the amazing things that don’t make it to the world because of this filter. Someone from at a tech company who’s disconnected from the art and technology will typically only bring the most conventional approaches to the market in the most sanitised ways - meaning many amazing, weird, and unique approaches don't make it into the hands of people who could do extraordinary work with them. 

You might think that this is inevitable - that it’s just the way things work. However, I don't believe that it needs to be. I think it's very possible to imagine a world where - thanks to AI - creating and shipping a beautiful consumer art tool is as easy as making a Comfy workflow.  In this world, it’s possible to imagine people combining different workflows and creative styles to create beautiful and unique art tools - tools that would be so easy-to-use and accessible that your grandmother could use them. And, due to the powerful workflows behind them, these tools could also be so capable that artists could use them to create masterpieces.

While the friction of creating an art tool today is significant, it would be possible to dramatically reduce this friction with an AI-powered tool-builder and supporting infrastructure that allows anyone to build and launch their own tool, featuring their workflows and the workflows of others, in a unique and opinionated flow. 

""")

st.markdown("### How would an AI-powered tool builder work?")

st.write("""

Simply, an AI-powered tool builder would work by having a user interact with an LLM that builds a creative tool based on their requests.  They would describe what they want the tool to look like and how they want it to work and, behind the scenes, a team of LLMs would work together to figure out how to manipulate the code to do exactly what they desire. This would happen fast - so they can change the tool as they're creating art wth it.

It would pull from an ecosystem of workflows in order to allow the tool-builder to implement both their own workflows and those of others - both alone and in combination - to give exactly the artistic effect they desire to end-users. Each tool would be embedded with the wisdom of the tool-builder - making decisions on behalf of the end user to create a smooth experience.

Additionally, there would be infrastructure that would enable them to not only create this tool but also to deliver it to the world via web, VR, and mobile apps - making it accessible to anyone.

""")

st.image('https://banodoco.s3.amazonaws.com/plan/using-tool-builder.png')

st.write("""
Behind the scenes, an AI-powered tool-builder might consist of at least 5 major parts:

- **A constrained, full-stack development framework:** the first part would be a constrained, full-stack framework optimised for building and shipping artistic tools. This would basically be the bare-bones of a structure for building a creative tool with a large number of  decisions common to all tools locked in - for example, on the structure of the project and the database behind it. The goal would be to make it easy for both a user to work with and for an AI to understand.
- **A team of LLM models:**  secondly, it will consist of a team of fine-tuned LLMs, each optimised to assist the user or perform tasks at different stages of the development process. For example, there might be an LLM that parses user instructions and sends them to specialists focused on different parts of the app. There could be a specialist focused on front-end development - trained on relevant code - another on database structure, or one that sense-checks the code changes after the user is finished. Each would be fine-tuned to perform specialised tasks competently, with the assumption that over time, as LLMs and AI improve, they can perform the tasks more broadly and with greater competence. The goal would be that the user interacts in plain language, while the LLMs do the heavy-lifting.
- **A community-built component library:** There would be many components common to a large number of applications - often ones too intricate and complex for the LLM models alone to build. For these, it would make sense to create a community-built component library that LLM builders pull from to equip their apps with advanced functionality. For example, there might be a timeline editing tool or a video cropping tool that anyone can feature in their app.
- **An ecosystem of workflows:** fourthly, we would also need an open ecosystem of workflows and workflow components that people can combine to achieve specific effects. The tool builder could present different options as part of the flow, allowing their end-users a filtered view of the overall ecosystem. Some tools might be very constrained, offering only a tiny number of workflows or even just one, while others might be broad, offering many. Different tool-makers will make different decisions in this regard based on their approach and style.
- **Supporting infrastructure:** finally, we need to build a supporting infrastructure to enable people to ship consumer apps and allow customers to run them locally on their computers. In both cases, we must dramatically reduce the friction for people to do this, allowing the apps to be accessible to both local users and the public at large.

Compared to a traditional drag and drop no-code builder, this would be infinitely flexible - instead of being constrained to the UX elements a builder offers, people could in theory manipulate the tool in all kinds of ways - while advanced users could dive directly into the code.  Combined, these would constitute a ‘successor approach’ to no-code tools like Webflow or Bubble.
""")


st.markdown("### If executed exceptionally well, this tool-builder would allow thousands of people to create weird & unique tools - and these would constantly evolve as AI does")

st.write("""

Firstly, doing this well would be extraordinarily hard - while advancing AI will help, making it so easy to ship consumer tools would require brilliant execution on a variety of fronts, in addition to building infrastructure, and nurturing a supporting ecosystem.

However, if executed exceptionally well, I believe it would allow thousands of people to create tools that combine workflows in unique, interesting ways. These tools would be the kind that no central organisation would ever come up with - they’d mostly be the product of some weird, opinionated individual going down a strange rabbit hole and coming up with some unusual and unconventional ideas that would manifest in the tool they produce. 

If these tools could come to market, the people who created them would be using them to make art. This art would ultimately be the best possible marketing for them - people would see the art and be inspired to create. For example, imagine the tool that a Quentin Tarantino of AI might make, and how that might differ from the tool that the Hayao Miyazaki would create. Now imagine thousands of people like this creating tools and marketing them with their art. As a result, I believe there would be significant consumer demand for them, especially considering each would be targeted at different groups and subcultures. 

AI art will constantly evolve over the next decade - this approach would allow the ecosystem of tools to constantly evolve along with it - with the individual tool creators and ecoystem participants strongly incentivised to keep evolving things as the technology evolves.

""")

st.markdown("### If - benefitting from extreme openness - we can build a collective of these apps into a successful business and attractive investment, we can build an economic engine for the ecosystem")

st.write("""
Our goal is to build a vibrant ecosystem of popular creative tools apps based on open source AI art, with each app being brought to market by a determined individual who strives to create the best experience possible, and who markets it by creating extraordinary art. 

This individual would bring their app to market via our tool and using our infrastructure and, given they’re part of the community, be happy to share a portion of their revenue with us and the ecosystem.

Through thousands of app-builders like this, this approach would allow us to develop an economic engine for the ecosystem and become a very successful business and attractive investment.

Given we’re directly benefiting from a thriving and open ecosystem, we could only be as successful as the ecosystem we’re a part of. We’d therefore be strongly incentivised to invest in initiatives to support and grow the ecosystem - for example:

- **Providing support for infrastructure builders:** many people expend extraordinary effort building essential infrastructure with no possibility of direct monetary reward - we should directly support these people.
- **Creating incentives to encourage openness among various participants:** we can create incentives to encourage people to share their work openly and publicly instead of keeping it to themselves - for example, by creating workflow competitions and prizes.
- **Building tools & models to power the ecosystems:** we can ship and support tools and models that power the ecosystem - especially in gaps that aren’t serviced by the existing ecosystem of open models.
- **Running competitions to inspire artists to push open source art to its potential:** the more high-effort art produced with open methods, the more this art impacts the wider world. We can create incentives for people to produce this art.
- **Building education resources for contributors:** the better the educational resources, the easier it will be to convert people to active ecosystem participants, the more active and productive ecosystem participants there would be.

I believe that this can be designed in such a way that it supports a thriving open source AI art ecosystem - the more the business thrives, the more the ecosystem does:
"""
)

st.image("https://banodoco.s3.amazonaws.com/plan/flourishing.png")

st.markdown("### And if the business is successful, everyone who contributed significantly will share in the reward")

st.write("""
If this ecosystem has tens of thousands of apps, with many finding their own unique audience, and each making revenue from people who pay to run the GPUs in the cloud, this would mean that the business behind these app becomes significantly valuable.

In most startups, the founders owns 90% and they split 10% between employees:
""")

st.image("https://banodoco.s3.amazonaws.com/plan/typical_startup_equity.png")

st.write("""
However, if you believe as we do that we’re in a space that will constantly change for the next decade and that this evolution will be driven by open source ingenuity, this incentive structure doesn’t reflect where the value will be created.

Instead, we're choosing a structure that aims to incentivise and inspire open source ingenuity in a cohesive direction throughout a far longer period - by sharing the realised value of 100% of our equity - aside from investment dilution - with contributors over the first 8.5 years:
""")

st.image("https://banodoco.s3.amazonaws.com/plan/open_source_native.png")

st.write("""

Practically, as per the illustration, this means that we’ll split 1% per month between people who contribute open source work that's aligned with our core goals. For legal reasons, this will probably not be structured as literal ownership in the entity - rather, the goal will be that realised gains are paid out proportionally to contributors' ownership amount. For example, say, if the company is valued at 1b USD, and you have 0.1% equity, that will be worth exactly 1m USD before cost of fund distribution and tax.

To achieve this, we'll likely have an entity that owns the "founder's" stock on behalf of the community and distributes realised gains at pre-agreed points - with investors investing into the LLC that the foundation starts with owning entirely. This will allow us to be an attractive investment due to having a conventional underlying corporate structure, while allowing us distribute gains via the foundation in a way that's fair and transparent to everyone in the community.

While the actual implementation of this is uncertain, below is an example of what it might look like:
""")
st.image("https://banodoco.s3.amazonaws.com/plan/structure.png")
st.write("""

 You can read more about this and our grants to date [here](https://banodoco.ai/Ownership).

This will mean - if we’re successful -  thousands of people who’ve contributed at various stages will share in the reward - thousands who will feel great about their contributions and who’ll hopefully reinvest some of their money in the ecosystem to help it flourish further.

It should also mean that we can bring some level of cohesion to the ecosystem - while the chaos of the ecosystem is its greatest strength, having incentivises aligned with participants may allow us to channel this chaos in many ways - giving some direction to the ecosystem and helping it to grow and thrive.

""")


st.markdown("### Our approach can help us leverage the power of openness to accelerate the AI art ecosystem")

st.write("""Being closed has many strengths - for example, people use secrecy and exclusive access to achieve an advantage. There are also many downsides to being open - for example, others can simply take the product of months - as has happened [to us](https://x.com/pom_I_moq/status/1788675646069277008)!
         
That said, I believe that there are also many strengths to being radically open - and that leveraging these strengths can give us a unique advantage. For example:
         
- We can leverage the creativity of thousands of people of relentlessly improve and evolve our tools and models - and people will be incentivised to help thanks our ownership model and bounties. Our community-driven approach will allow us to drive the ecosystem.
- The thousands of tool-builders in our ecosystem will be incentivised to create tools that are open and interoperable - this will make it easier for others to build on top of their work and for the ecosystem to grow.
- The best artists will generally want to use our tools because they'll be created by artists and have more control - essentail for artists - given they leverage the open ecosystem. The art made with our tools will then therefore be the best and act as the best marketing imaginable.
- People will generally want us to succeed and see our success as being good for the world - given our philosophy and approach, and public sentiment towards open source AI vs. closed AI. This - and sharing our ownership - will allow us to attract better talent and artists.

I believe that these strengths - if leveraged well - can not only make up for the downsides of being open, allow us and the ecosystem we represent to flourish!
         
""")


st.markdown("### What does it mean to build a tiny piece of the 2nd Renaissance?")

st.write("""

We're at the beginning of a very important time in human history.  One thing I’ve been wondering is what this era may be known to people hundreds of years from now. It’s not always obvious to people in history at the time what that would be - for example, did people during the Dark Ages know they were in the Dark Ages? 

An obvious answer to the question of what our current age will be called might be that this era is simply going to be the “Age of AI” - AI is going to be a dominant, powerful technology that permeates our lives and it might become **so** dominant that this age becomes known for it. That doesn’t necessarily sound too bad at first until you consider that it would mean that the most remarkable thing from this era is the technology itself, not what we did with it. We have tools that empower us to create and do so much - every individual will soon have access to the intellectual capacity of our species! AI being important feels like a given, but it dominating the historical perception of this era feels a little dystopian.

A more utopian idea for this era is that it might be that it becomes known as a “2nd Renaissance” - an age of such multi-faceted human creativity, exploration and innovation that it seems like a rightful successor to the time that brought us out of the Dark Ages. 

When you think of the present and future this way, it becomes obvious that some technologies and philosophical approaches to technology are more “Age of AI” while others are more “2nd Renaissance”. For example, it feels obvious that closed AI - one in which a small group of people determine what an AI model can and can’t do - is an “Age of AI” philosophy. Still advanced and futuristic but potentially cold and dystopian.

By contrast, I would like our collected efforts to aim to be a tiny piece of a 2nd Renaissance - for us to contribute towards a world where no individual or company can decide what art should or shouldn’t be - but in which the beautiful and chaotic mess of humanity is equipped to invent their piece of our artistic and creative landscape. 

I believe that if we succeed to the fullest extent we can have a hugely positive impact on the open AI ecosystem and in turn nudge the world in a more utopian direction. And maybe - if humans reach their creative potential with AI - the level of creativity unlocked in this era will so profound that we come to see the last 50 years as a dark age by comparison!

""")

st.image("https://banodoco.s3.amazonaws.com/plan/2nd-renaissance.jpeg")

st.markdown("### A thriving ecosystem is the product of people building it - and the talent and support of lots of brilliant people will be required to build this piece")

st.write("""

Finally, I'll say that thriving ecosystems don't just happen: they're the product of talented, dedicated people deciding on a direction and spending enormous effort over a long period building them.

If those of us who believe in open source can coordinate around specific efforts, I believe that we can improve the future in a meaningful way - while building an extremely successful business. 
         
Capitalism makes the world go round - it's what determined what people work on and who has resources to do what. We can get it working in Open Source AI art's favour.
         
If you want to support this effort, please get in touch with me [on Discord](https://discord.gg/eKQm3uHKx2).

""")

st.image("https://banodoco.s3.amazonaws.com/plan/apes-together.gif",use_column_width=True)

st.markdown("### Previously Asked Questions:")


with st.expander("How are you building towards this?", expanded=False):
  st.markdown('''
  
  Firstly, we've been building the Banodoco community - this community has been a hub for people who are driving the technical and artistic development of Animatediff - basically, it's a wonderful place where artists and builders of various types learn from, inspire, and collaborate with one another.

The people who hang out here have been driving the development that made [Steerable Motion](https://github.com/banodoco/steerable-motion) possible - a technique we're pioneering for driving animations with batches of images. This technique has been getting increasing interest from artists - however, it's been difficult to use due to being locked up in ComfyUI - a developer-oriented un-user-friendly UX.

To deliver Steerable Motion to the masses, we've been building <a href="/Dough" target="_self">Dough</a> an animation tool that's designed for artists who wish to have precise control over their work. We believe that this tool will allow people to create extraordinary - especially non-technical people who want to take a step-up from their Midjourney creating and want a tool crafted for artists.

  
  ''', unsafe_allow_html=True)

with st.expander("Can I invest?",):
  st.write("We're raising 1m USD and a 10m USD valuation - if you're interested in investing, please DM me [on Discord](https://discord.gg/eKQm3uHKx2). We're only accepting money from individuals and small funds at this stage. We'll raise a larger institutional round once we've made more progress.")
with st.expander("Won't someone just copy this plan?"):
  st.write("""They could and other companies have a history of [ripping of our work](https://x.com/pom_I_moq/status/1788675646069277008). However, for this plan to work it requires the support of thousands of artsits and open source people - who will build and market tools on top of our infrastructure based on the work of the ecosystem. 
           
  We believe that these people will much prefer to build on top of us, given doing so will give them and others who made their work possible [significant ownership](https://banodoco.ai/Ownership) in our company.""")
with st.expander("Why not do [[some other thing]] instead?"):
  st.write("There are many ways to help the ecosystem - this is just one that I think could be very impactful and can capture a lot of economic value. If you have a better idea, please go and do it and I'll be glad to support you! If you think you might do it as part of this, please DM me [on Discord](https://discord.gg/eKQm3uHKx2).")
with st.expander("Who is behind this?"):
  st.write('''This is written by Peter O'Malley, or POM. I do a little bit of everything. You can find me on Twitter [here](https://twitter.com/pom_I_moq/), Github [here](https://github.com/peteromallet), see some of my art [here](https://www.youtube.com/@misterpeterface). Previously, I worked with a few successful startups, and started a startup that achieved initial success but ultimately failed - you can read more about that [here](https://www.schlupfloch.xyz/explaining-advisables-failure/). I work with lone_samurai or [Piyush Kumar](https://x.com/thisispiyushK), another founder and engineer who's been building the infrastructure for our tools while I work on the front-end.
           
In addition to this, we will work with and support people who build open infrastructure on top of the ecosystem like [Matt30](https://github.com/cubiq) and [Kosinkadink](https://github.com/kosinkadink), and share bounties for others to complete tasks that help the ecosystem and are aligned with our goals.
                     
Our plan is to build a core team who's working towards the main goal (we're seeking a [front-end developer](https://x.com/pom_I_moq/status/1789420417850978559) right now if you're interested), alongside a fluid team on specific projects. If you're interested in working with us, please DM me [on Discord](https://discord.gg/eKQm3uHKx2).''')
  

with st.expander("How will the equity/ownership of the company be structured?"):
  st.write("This remains to be confirmed - however, it'll likely be a normal company that's partially owned by a foundation on behalf of the community - with an agreement to distribute realised gains at pre-determined points:")
  st.image("https://banodoco.s3.amazonaws.com/plan/structure.png")
  st.write("There are many companies that have similar structures with foundation owners - for example, IKEA is owned by the Ingka Foundation, Novo Nordisk is controlled by Novo Nordisk Foundation, while OpenAI is owned by a 501(c) non-profit.")
  st.write("With a foundation owning 100% of pre-dillution shares, I believe it will be possible to design and implement an approach to distribution of secondary-sale proceeds that works seamlessly. However, implementing this will require extensive legal and tax advice that we will invest in post-funding. Our ultimate goal is that it can be both an attractive investment and a fair and transparent structure that everyone in the community can easily understand and get behind.")
with st.expander("Won't the equity approach result in a lot of people only getting a tiny amount of equity?"):
  st.write("Proportionally, this is true - most people will have a fraction of a percent. However, our goal with this is to build a very big business - meaning that even a tiny fraction of a percent will be worth a lot of money. For example, if we're valued at 1b USD, 0.1 percent of equity will be worth 1m USD before cost of fund distribution and tax. If we're valued at 10b USD, 0.1 percent will be worth 10m USD. While _objectively_ unlikely, shooting for that or more is our goal and, if we're successful, that would be pretty significant for most people. If we're not, life goes on.")
with st.expander("Will you train models?"):
  st.write("While we will use every open model possible as our approach is model-agnostic, we will of course train models where it makes sense to do so and openly release them - there are many gaps in the ecosystem that need to be filled, and many areas where poorly-licenced or old models need to be replaced with truly open models that are competitive with closed ones.")
with st.expander("Will you openly release everything you build?"):
  st.write("Yes, we will release everything that can be useful to others. Our approach benefits from openess - the more successful the ecosystem, the more successful we'll be. We have an economic incentive to be as open as possible.")
with st.expander("How will the equity be distributed?"):
  st.write("Again, this remains to be seen - however, we'll probably have some legal abstraction such that when the value on equity is realised we'll give owners a possibility to 'sell' theirs - for example, if we do a secondary sale of shares, or we IPO - the value of the equity will be distributed proportionally to the equity holders through some entity that 'owns' the company. This will likely be a trust or foundation of some kind that owns the shares in the corporation that investors invest in.")
with st.expander("If all your tools are open, why won't someone just copy them and make money?"):
  st.write("By all means they can. However, our goal will be to have inference as cheap as possible - meaning there will be limited scope for such bottom feeders to make money. Our tools will also be made and promoted by artists - I think people will typically want to support them and us given this and the art the tool-creator makes will be the unbeatable marketing for the tool. Would you want to use the tool the Quentin Tarantino of AI made or the one some random company ripped off that's also probably more expensive?")
with st.expander("What about [[thing that may become a problem if we're wildly succcessful in several years]]?"):
  st.write("Building a company is a commitment to endlessly solve problems for decades. Some it may sense to worry about right now, many it makes sense to worry about as they become problems. Thankfully, if we're wildly successful, we'll have the resources to deal with many problems. If we're not, it won't be a problem.")
with st.expander("Won't the approach to equity be complicated/scare away many investors?"):
  st.write("It will definitely be complicated and will also definitely scare off the overwhelming majority of investors - especially for the first 1-2 years. To overcome this, we'll need to be obviously exceptional in terms of our execution and direction and make far more progress than more conventional companies need to - if we can put things into the world that helps others see pieces of the vision, I believe that it'll be extremely attractive to those who understand what we're doing, understand how significant it can be, and are aligned with it. We don't need to appeal to everyone or every investor - just those who reach this conclusion.")
with st.expander("What about what [[other open initiative/company]] are doing?"):
  st.write("We're in the most positive sum space in the world - in this space, no one needs to fail for others to succeed - the more ambitious open source efforts, the better!")

with st.expander("Won't this attract people who are just doing it for the money like crypto did?"):
  st.write("Adding money and incentives blurs the lines of motivation. However, if this does get people rich, it will be the ultimate 'get rich slow' scheme - and will likely as a result only attract people who believe in the idea and open source enough to commit to that. People who are looking for easy/short-term wins will find better outlets.")
with st.expander("How will you decide what projects to undertake and fund?"):
  st.write("This remains to be seen but it will be some combination of central planning and community voting. I think it's important that we have a clear vision and direction but also that things are structured such that the community can drive the direction and investments in a meaningful way. It's unclear right now what this will look like.")
with st.expander("Is it not a bit obnoxious to think we can build a piece of the '2nd Renaissance?'"):
  st.write("That's more of a statement than a question but I did say a _tiny_ piece!")
with st.expander("Could you please try to explain this with an art project instead of writing?"):
  st.write("I'm working on it! (note: this question was asked by me)")
with st.expander("Where does the name Banodoco come from?"):
  st.markdown("Banodoco is named after the 4 painters who assisted Michelangelo in the creation of the Sistine Chapel:")
  st.markdown("- <span style='color:red'>Ba</span>stiano da Sangallo",unsafe_allow_html=True)
  st.markdown("- Giulia<span style='color:blue'>no</span> Bugiardini",unsafe_allow_html=True)
  st.markdown("- Agnolo di <span style='color:green'>Do</span>nnino",unsafe_allow_html=True)
  st.markdown("- Jacopo del Tedes<span style='color:purple'>co</span>",unsafe_allow_html=True)
  st.markdown("We aim to build an ecosystem and tooling that equip everyone with equivalent master-level artistic assistance!")

with st.expander("I have another question"):
  st.write("Please DM me (POM) on [Discord](https://discord.gg/eKQm3uHKx2) and I'll add the reply here for others to see if need be.")

footer()


