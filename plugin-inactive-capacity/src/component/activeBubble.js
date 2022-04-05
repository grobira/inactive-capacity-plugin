import { Component } from "react";


export class ActiveBubble extends Component {
    constructor (props) {
        super(props)
    }

    render() {
        let style = {
            fontFamily: "Open Sans",
            fontSize: "12px",
            display: "inline",
            marginTop: "5px",
            width: "91px",
            height: "19px",
            backgroundColor: "#a6a6a6",
            textAlign: "center",
            borderRadius: "25px",
            border: "0px"
        }

        return <div style={style}>Inactive</div>
    }
}