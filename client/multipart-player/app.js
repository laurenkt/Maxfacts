import React    from "react"
import ReactDOM from "react-dom"
import YouTube from "react-youtube"

class Player extends React.Component {
	constructor(props) {
		super(props)

		this.state = {
			current_idx: 0,
			finished: false,
		}

		this.onEnd = this.onEnd.bind(this)

		this.player = null
	}
	
	static get propTypes() {
		return {
			video: React.PropTypes.object,
		}
	}

	onEnd(e) {
		this.setState({finished:true})
	}

	playVideoAtIndex(idx) {
		this.setState({
			finished: false,
			current_idx: idx,
		})
	}

	onClickTitle(idx) {
		return e => {
			e.preventDefault()
			this.playVideoAtIndex(idx)
		}
	}

	render() {
		const filenames = this.props.video.filename.split(',')
		const titles = this.props.video.titles.split("\n")
		const {finished, current_idx} = this.state

		const renderTitle = (title, idx) =>
			<li key={idx} className={idx == current_idx ? "active" : ""}>
				<a href="#" onClick={this.onClickTitle(idx)}>
					{title}
				</a>
			</li>

		return (
			<div className="video-player">
				<div className="video-select-exercise">
					<h3>Exercises <span className="help">click to play</span></h3>
					<ol className="video-titles">
						{titles.map(renderTitle)}
					</ol>
				</div>
				<div className="video-content">
					{finished && 
						<div className="video-endcard">
							<a href="#" className="-this" onClick={() => this.setState({finished: false, current_idx: current_idx})}>
								<h4>{titles[current_idx]}</h4>
								<p>Repeat this exercise 5 times</p>
								<img style={{maxWidth: '200px'}} src={`http://img.youtube.com/vi/bla/maxresdefault.jpg`} />
							</a>
							{(current_idx+1 < filenames.length) &&
								<a href="#" className="-next" onClick={() => this.setState({finished: false, current_idx: current_idx+1})}>
									<h4>Play next exercise</h4>
									<p>{titles[current_idx+1]}</p>
									<img style={{maxWidth: '200px'}} src={`http://img.youtube.com/vi/bla/maxresdefault.jpg`} />
								</a>}
							{(current_idx+1 >= filenames.length) &&
								<div className="-next">
									<p>No more videos in this series</p>
								</div>}
						</div>}
					{!finished &&
						<video
							src={filenames[current_idx]}
							onEnded={this.onEnd}
							controls="controls"
							autoPlay="autoplay">
						</video>}
				</div>
			</div>
		)
	}
}

document.addEventListener("DOMContentLoaded", _ => {
	let video_data = JSON.parse(document.getElementById("video_data").innerHTML)

	const div_in_document  = document.getElementById("video-player")
	const container = document.createElement("div")
	container.className = "content-editor"

	ReactDOM.render(<Player
		video={video_data}
	/>, container)
	
	div_in_document.parentNode.replaceChild(container.childNodes[0], div_in_document)
})
