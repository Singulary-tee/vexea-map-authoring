# Fable Studio & Google DeepMind — Verified GitHub Evidence
## Confidence: VERIFIED (from actual GitHub READMEs)
## Search date: 2025

## Fable Studio
**Organizations found:** fable-stories, FableStudio, fable-ai

### fable-stories/fable-ios
**Description:** 

**Spatial/AI signals:** environment, generate

**README excerpt:**
```


# Fable

## Installation

1. Install macOS package manager - [Homebrew](https://brew.sh/)
```bash
curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install | ruby
```
2. Install Ruby dependencies - [Cocoapods](https://cocoapods.org/), [Bundler](https://bundler.io/)
```bash
sudo gem install bundler
bundle installs
```
---
**NOTE**: If `bundle install` is giving you issues, it might be a ruby versioning issue. In this case install [rbenv](https://github.com/rbenv/rbenv) and configure your ruby environment to the latest version and run `bundle install` again. 

---
3. Install Swift developer tools - [Sourcery](https://github.com/krzysztofzablocki/Sourcery), [Xcodegen](https://github.com/yonaskolb/XcodeGen), [Swiftformat](https://github.com/nicklockwood/SwiftFormat)
```bas
```

### fablestudio/SceneSplitterCLI
**Description:** A pyscenedetect based scene splitting tool for video files.

**Spatial/AI signals:** scene

**README excerpt:**
```
# SceneSplitter

A cross-platform command-line tool that splits an H.264 video into
approximately fixed-length pieces (default ~1 minute), cutting at scene
changes detected by [PySceneDetect](https://www.scenedetect.com/). Each piece
ends at the **first scene cut at or after** the target length, so pieces are
at least the target length and never cut mid-scene.

Cuts are frame-accurate, landing exactly on the detected scene boundaries.
By default pieces are re-encoded to **H.264 MP4 at 8 Mbps** (regardless of the
input container), keeping the source resolution and frame rate. Audio is
stream-copied untouched, or transcoded to AAC only if the source audio isn't
MP4-compatible. Use `--match-source` to re-encode at the source's
own bitrate, or `--copy` for a fast lossless stream copy that keep
```

### fablestudio/DramaBox
**Description:** super expressive prompting model based on ltx2.3

**Spatial/AI signals:** generate

**README excerpt:**
```
<p align="center">
  <a href="https://www.resemble.ai/learn/models/dramabox">
    <img src="assets/Dramabox.png" alt="DramaBox" width="720"/>
  </a>
</p>

# DramaBox — Expressive TTS with Voice Cloning

[![Alt Text](https://huggingface.co/datasets/huggingface/badges/resolve/main/open-in-hf-spaces-sm.svg)](https://huggingface.co/spaces/ResembleAI/Dramabox)
[![Discord](https://img.shields.io/discord/1377773249798344776?label=join%20discord&logo=discord&style=flat)](https://discord.gg/rJq9cRJBJ6)

> **Built on [LTX-2](https://github.com/Lightricks/LTX-2) by Lightricks.**
> DramaBox is **Resemble AI's** expressive TTS, trained on top of the LTX-2.3 audio branch under the LTX-2 Community License. Huge thanks to the Lightricks team for open-sourcing the base.

*Made with ♥️ by* <a href="https://
```

### fablestudio/fable-saga
**Description:** 

**Spatial/AI signals:** 3d, environment, generate

**README excerpt:**
```
SAGA: Skill to Action Generation for Agents
===========================================

Join the Community
--------
> 🚨Private Beta Applications now open for the 3D environment that works with SAGA called Thistle Gulch - [Check out the announcement and apply](https://blog.fabledev.com/blog/beta-application-for-thistle-gulch-now-open)! In the meantime, try out the space-colony text based demo below.
> We're creating a dev-community around SAGA, Thistle Gulch, and Multi-Agent Simulations in general. [Reach out on twitter](https://twitter.com/frankcarey) if you're interested!

Demo Quickstart
-------------
1. Make sure you have git, python-3.10/11, and poetry installed and OPENAI key setup (see below).
2. Clone this repo and change the directory to it.
3. run `poetry install --all-extras --w
```

### fablestudio/Resemblyzer
**Description:** A python package to analyze and compare voices with deep learning

**Spatial/AI signals:** character, generate

**README excerpt:**
```
Resemblyzer allows you to derive a **high-level representation of a voice** through a deep learning model (referred to as the voice encoder). Given an audio file of speech, it creates a summary vector of 256 values (an embedding, often shortened to "embed" in this repo) that summarizes the characteristics of the voice spoken. 

N.B.: this repo holds 100mb of audio data for demonstration purpose. To get [the package](https://pypi.org/project/Resemblyzer/) alone, run `pip install resemblyzer` (python 3.5+ is required).

## Demos
**Speaker diarization**: [\[Demo 02\]](https://github.com/resemble-ai/Resemblyzer/blob/master/demo02_diarization.py) recognize who is talking when with only a few seconds of reference audio per speaker:  
*(click the image for a video)*

[![demo_02](https://i.imgur.c
```

### fablestudio/thistle-gulch
**Description:** A Multi-Agent Gym Environment set in the wild west.

**Spatial/AI signals:** 3d, character, environment, generate

**README excerpt:**
```
# Thistle Gulch

A Multi-Agent Gym Environment (MAGE) set in the wild west to simulate the actions and conversations of characters in a
realistic 3D Western town.

<img width="400px" src="docs/images/thistle-gulch-logo-and-background.jpg" alt="thistle gulch logo" title="Thistle Gulch Logo">

## About

This project consists of two parts that work together:
The [Thistle Gulch Runtime](https://fablestudio.itch.io/thistle-gulch) which is
a 3D game engine (called the "Runtime") and this python project (called the "Bridge") that acts similar to a client for the Runtime. The Bridge also leverages our
[open-source SAGA python library](https://github.com/fablestudio/fable-saga) to generate actions and conversations. The
simulation is rendered in 3D using the Thistle Gulch Runtime app which can be d
```

### fablestudio/ComfyUI
**Description:** The most powerful and modular stable diffusion GUI, api and backend with a graph/nodes interface.

**Spatial/AI signals:** 3d

**README excerpt:**
```
# ComfyUI

## The most powerful and modular stable diffusion GUI and backend.

## Clone this Repo

Open your terminal and type the following command:

```bash
git clone https://github.com/fablestudio/ComfyUI
cd ComfyUI
```

## Install Project Dependencies

```bash
python -m venv venv
venv\Scripts\activate
```

### NVIDIA

Nvidia users should install stable pytorch using this command:

`pip install torch torchvision torchaudio --extra-index-url https://download.pytorch.org/whl/cu121`

This is the command to install pytorch nightly instead which might have performance improvements:

`pip install --pre torch torchvision torchaudio --index-url https://download.pytorch.org/whl/nightly/cu121`

#### Troubleshooting

If you get the "Torch not compiled with CUDA enabled" error, uninstall torch with
```

### fablestudio/chatterbox
**Description:** SoTA open-source TTS

**Spatial/AI signals:** generate

**README excerpt:**
```

<img width="1200" alt="cb-big2" src="https://github.com/user-attachments/assets/bd8c5f03-e91d-4ee5-b680-57355da204d1" />

# Chatterbox TTS

[![Alt Text](https://img.shields.io/badge/listen-demo_samples-blue)](https://resemble-ai.github.io/chatterbox_demopage/)
[![Alt Text](https://huggingface.co/datasets/huggingface/badges/resolve/main/open-in-hf-spaces-sm.svg)](https://huggingface.co/spaces/ResembleAI/Chatterbox)
[![Alt Text](https://static-public.podonos.com/badges/insight-on-pdns-sm-dark.svg)](https://podonos.com/resembleai/chatterbox)
[![Discord](https://img.shields.io/discord/1377773249798344776?label=join%20discord&logo=discord&style=flat)](https://discord.gg/rJq9cRJBJ6)

_Made with ♥️ by <a href="https://resemble.ai" target="_blank"><img width="100" alt="resemble-logo-horizontal" s
```

### fablestudio/was-node-suite-comfyui
**Description:** An extensive node suite for ComfyUI with over 210 new nodes

**Spatial/AI signals:** 3d

**README excerpt:**
```
# **WAS** Node Suite &nbsp; [![Colab](https://camo.githubusercontent.com/84f0493939e0c4de4e6dbe113251b4bfb5353e57134ffd9fcab6b8714514d4d1/68747470733a2f2f636f6c61622e72657365617263682e676f6f676c652e636f6d2f6173736574732f636f6c61622d62616467652e737667)](https://colab.research.google.com/github/WASasquatch/was-node-suite-comfyui/blob/main/ComfyUI_%2B_WAS_Node_Suite_and_ComfyUI_Manager.ipynb) [![Hits](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fgithub.com%2FWASasquatch%2Fwas-node-suite-comfyui&count_bg=%233D9CC8&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=hits&edge_flat=false)](https://hits.seeyoufarm.com) [![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg)](https://paypal.me/ThompsonJordan?country.x=US&locale.x=en_US)

<p align="center">
    <im
```

### fablestudio/OpenVoice
**Description:** Instant voice cloning by MyShell.

**Spatial/AI signals:** world, three, generate

**README excerpt:**
```
<div align="center">
  <div>&nbsp;</div>
  <img src="resources/openvoicelogo.jpg" width="400"/> 

[Paper](https://arxiv.org/abs/2312.01479) |
[Website](https://research.myshell.ai/open-voice) 

</div>

## Introduction

### OpenVoice V1

As we detailed in our [paper](https://arxiv.org/abs/2312.01479) and [website](https://research.myshell.ai/open-voice), the advantages of OpenVoice are three-fold:

**1. Accurate Tone Color Cloning.**
OpenVoice can accurately clone the reference tone color and generate speech in multiple languages and accents.

**2. Flexible Voice Style Control.**
OpenVoice enables granular control over voice styles, such as emotion and accent, as well as other style parameters including rhythm, pauses, and intonation. 

**3. Zero-shot Cross-lingual Voice Cloning.**
Neither 
```

### fablestudio/stable-diffusion-webui
**Description:** Stable Diffusion web UI

**Spatial/AI signals:** generate

**README excerpt:**
```
# Stable Diffusion web UI
A browser interface based on Gradio library for Stable Diffusion.

![](screenshot.png)

## Features
[Detailed feature showcase with images](https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Features):
- Original txt2img and img2img modes
- One click install and run script (but you still must install python and git)
- Outpainting
- Inpainting
- Color Sketch
- Prompt Matrix
- Stable Diffusion Upscale
- Attention, specify parts of text that the model should pay more attention to
    - a man in a ((tuxedo)) - will pay more attention to tuxedo
    - a man in a (tuxedo:1.21) - alternative syntax
    - select text and press ctrl+up or ctrl+down to automatically adjust attention to selected text (code contributed by anonymous user)
- Loopback,
```

### fablestudio/motion-diffusion-model
**Description:** The official PyTorch implementation of the paper "Human Motion Diffusion Model"

**Spatial/AI signals:** 3d, environment, generate

**README excerpt:**
```
# MDM: Human Motion Diffusion Model

[![PWC](https://img.shields.io/endpoint.svg?url=https://paperswithcode.com/badge/human-motion-diffusion-model/motion-synthesis-on-humanact12)](https://paperswithcode.com/sota/motion-synthesis-on-humanact12?p=human-motion-diffusion-model)
[![PWC](https://img.shields.io/endpoint.svg?url=https://paperswithcode.com/badge/human-motion-diffusion-model/motion-synthesis-on-humanml3d)](https://paperswithcode.com/sota/motion-synthesis-on-humanml3d?p=human-motion-diffusion-model)
[![arXiv](https://img.shields.io/badge/arXiv-<2209.14916>-<COLOR>.svg)](https://arxiv.org/abs/2209.14916)

The official PyTorch implementation of the paper [**"Human Motion Diffusion Model"**](https://arxiv.org/abs/2209.14916).

Please visit our [**webpage**](https://guytevet.github.io/md
```

### fablestudio/AI-Render
**Description:** Stable Diffusion in Blender

**Spatial/AI signals:** scene, generate, story

**README excerpt:**
```
# AI Render - Stable Diffusion in Blender

Render with Stable Diffusion in Blender. This add-on renders an AI generated image based on a text prompt and your scene.

Create incredible AI generated images with Stable Diffusion easily, without running any code on your own computer!


## Installation

- Get AI Render on [Blender Market](https://blendermarket.com/products/ai-render) or [Gumroad](https://airender.gumroad.com/l/ai-render)
- Open Blender, then go to Edit > Preferences > Add-ons > Install and then find the zip file

(You can also download for free on the [releases page](https://github.com/benrugg/AI-Render/releases))


## Demo

[![Watch the demo video](https://user-images.githubusercontent.com/1221274/195998824-da0b052e-8606-4afb-a842-527539f672c0.jpg)](https://www.youtube.com/wat
```

### fablestudio/SerializableDictionaryLite
**Description:** Serialized Dictionary is an easy to use system that allows you to have a Dictionary being serializable and editable on the Unity inspector.

**Spatial/AI signals:** 

**README excerpt:**
```
**Available on Asset Store:** https://assetstore.unity.com/packages/tools/utilities/serialized-dictionary-lite-110992

**Forum Thread:** https://forum.unity.com/threads/released-serializable-dictionary-lite-now-allowing-custom-editor-for-key-field.518178

![SerializableDictionaryLite](.media/Cover.png)

# About
This repo contains a class SerializableDictionaryBase that can be inherited to be able to have a serializable dictionary.

# Usage
For using the dictionary all you need is to create a class that inherits SerializableDictionaryBase and use Serializable Key and Value types. For any further explanation open op the Documentation file.

# Installation
* Import the asset from the [Asset Store](https://assetstore.unity.com/packages/tools/utilities/serialized-dictionary-lite-110992)
* Manua
```

### fablestudio/arfoundation-samples
**Description:** Example content for Unity projects based on AR Foundation

**Spatial/AI signals:** scene, 3d

**README excerpt:**
```
# AR Foundation Samples

Example projects that use [*AR Foundation 4.2*](https://docs.unity3d.com/Packages/com.unity.xr.arfoundation@4.2/manual/index.html) and demonstrate its functionality with sample assets and components.

This set of samples relies on five Unity packages:

* ARSubsystems ([documentation](https://docs.unity3d.com/Packages/com.unity.xr.arsubsystems@4.2/manual/index.html))
* ARCore XR Plug-in ([documentation](https://docs.unity3d.com/Packages/com.unity.xr.arcore@4.2/manual/index.html))
* ARKit XR Plug-in ([documentation](https://docs.unity3d.com/Packages/com.unity.xr.arkit@4.2/manual/index.html))
* ARKit Face Tracking ([documentation](https://docs.unity3d.com/Packages/com.unity.xr.arkit-face-tracking@4.2/manual/index.html))
* ARFoundation ([documentation](https://docs.uni
```

### fablestudio/amass
**Description:** Data preparation and loader for AMASS

**Spatial/AI signals:** three

**README excerpt:**
```
# AMASS: Archive of Motion Capture as Surface Shapes

![alt text](github_data/datasets_preview.png "Samples of bodies in AMASS recovered from Motion Capture sequences")

[AMASS](http://amass.is.tue.mpg.de) is a large database of human motion unifying different optical marker-based motion capture datasets by representing them within a common framework and parameterization. 
 AMASS is readily useful for animation, visualization, and generating training data for deep learning.

Here we provide tools and tutorials to use AMASS in your research projects. More specifically:
- Following the recommended splits of data by AMASS, we provide three non-overlapping train/validation/test splits.
- AMASS uses an extended version of [SMPL+H](http://mano.is.tue.mpg.de/) with [DMPLs](http://smpl.is.tue.mpg.
```

### Fable-AI/Prompt-generator
**Description:** A character & story scene prompt generator

**Spatial/AI signals:** 

**README excerpt:**
```
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.or
```


## Google DeepMind (Astra-adjacent)
**Note:** Project Astra is a Google DeepMind research project (announced Google I/O 2024).
It is a real-time multimodal AI assistant — primarily a vision/language model, NOT a Three.js scene generator.
It demonstrates spatial understanding of physical environments via camera feeds, not procedural 3D generation.

### google-deepmind/geeflow
**Description:** GeeFlow - generate and process large-scale geospatial datasets with Google Earth Engine.

**Signals:** spatial, image

**README excerpt:**
```
# GeeFlow

<div style="text-align: left">
<img align="right" src="https://raw.githubusercontent.com/google-deepmind/geeflow/main/docs/images/geeflow_logo_1.png" width="100">
</div>

GeeFlow is a library for generating large scale geospatial datasets using
[Google Earth Engine](https://earthengine.google.com/) (GEE). It contains utils,
configs, and pipeline launch scripts to generate geospatial datasets. The focus
is on supporting geospatial AI research, and it does not aim to be a
production-ready utility.

The datasets created conform to the TFDS format and can be directly used with
TFDS `tf.data.Dataset` data pipelines.

What can it be used for:

-   Creating small- and large-scale datasets, supervised and unsupervised, ready
    for ingestion into geospatial AI model training (with stan
```

### google-deepmind/representations4d
**Description:** Foundation models for 4D spatial and temporal vision tasks.

**Signals:** scene, spatial, 3d, vision, scene understanding, video, image

**README excerpt:**
```
# 4D Representations

Welcome to the official Google DeepMind repository for 4D Representations.

* [Scaling 4D Representations](https://arxiv.org/abs/2412.15212) focuses on evaluating self-supervised learning on non-semantic vision tasks that are more spatial (3D) and temporal (+1D = 4D), such as camera pose estimation, point and object tracking, and depth estimation. We show that by learning from very large video datasets, masked auto-encoding (MAE) with transformer video models actually scales, consistently improving performance on these 4D tasks, as model size increases from 20M all the way to the largest by far reported self-supervised video model 22B parameters.

![scaling results](./assets/scaling_20M_20B.png)

<!-- disableFinding(LINE_OVER_80) -->

* [Moving Off-the-Grid (MooG)](ht
```

### google-deepmind/lab
**Description:** A customisable 3D platform for agent-based AI research

**Signals:** 3d, environment

**README excerpt:**
```
# <img src="/docs/template/logo.png" alt="DeepMind Lab">

*DeepMind Lab* is a 3D learning environment based on id Software's
[Quake III Arena](https://github.com/id-Software/Quake-III-Arena) via
[ioquake3](https://github.com/ioquake/ioq3) and
[other open source software](#upstream-sources).

<div align="center">
  <a href="https://www.youtube.com/watch?v=M40rN7afngY" target="_blank">
    <img src="http://img.youtube.com/vi/M40rN7afngY/0.jpg"
         alt="DeepMind Lab - Nav Maze Level 1"
         width="240" height="180" border="10" />
  </a>
  <a href="https://www.youtube.com/watch?v=gC_e8AHzvOw" target="_blank">
    <img src="http://img.youtube.com/vi/gC_e8AHzvOw/0.jpg"
         alt="DeepMind Lab - Stairway to Melon Level"
         width="240" height="180" border="10" />
  </a>
  <a href
```

### google-deepmind/eval_hub
**Description:** Gemini evaluations

**Signals:** 

**README excerpt:**
```
Open-source repository on GitHub for releasing Gemini evaluations.
```

### google-deepmind/gemini-robotics-sdk
**Description:** 

**Signals:** environment

**README excerpt:**
```
# Safari SDK: the SDK for Google DeepMind Gemini Robotics models 🦓🦄🐘🐒🐍

## Disclaimer

This is not an officially supported Google product.

Safari SDK provides full lifecycle toolings necessary for using Gemini Robotics
models, including but not limited to, access checkpoint, serving a model,
evaluate the model on robot and in sim, upload data, finetuning the model,
download the finetuned checkpoint, etc. Most of the functionality requires you
to join Gemini Robotics Trusted Tester Program to use. See details in Gemini
Robotics [main page](https://deepmind.google/models/gemini-robotics/).

## Source Code

The source code can be found in
[GitHub](https://github.com/google-deepmind/gemini-robotics-sdk).

Note: Unless stated otherwise, the commands below assume that your working
directory is 
```


## What This Means for the KB
- **Fable Studio**: AI-driven interactive narrative (story + character + environment). NOT a Three.js spatial generator.
  Their spatial contribution: AI agents that understand scene context and narrative-space relationships.
- **Project Astra**: Real-time vision+language understanding of physical space. NOT a Three.js scene generator.
  Their spatial contribution: semantic spatial understanding — 'left of', 'behind', 'on top of' from visual input.
- **The v1 KB claim** that these are 'Three.js WebGPU scene generators' was INCORRECT.
- **Correct framing**: They demonstrate spatial AI *reasoning*, not spatial *geometry generation*.
  Their relevance is as inspiration for spatial language → spatial intent, not as code examples.
