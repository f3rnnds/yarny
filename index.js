const audioCtx = new AudioContext()

document.getElementById("recipe-compile").addEventListener("click", compileRecipe)
document.getElementById("rows-next").addEventListener("click", nextRow)
document.getElementById("rows-previous").addEventListener("click", previousRow)
document.getElementById("points-next").addEventListener("click", nextPoint)
document.getElementById("points-previous").addEventListener("click", previousPoint)
document.addEventListener("keyup", (e) => { if (e.code === "Space") nextPoint() })
document.getElementById("recipe").addEventListener("keyup", (e) => { if (e.code === "Enter") compileRecipe() })

const table = {
    "sc": { "name": "single crochet", "cost": 1 },
    "sc2tog": { "name": "single crochet two together", "cost": 2 },
    "hdc": { "name": "half double crochet", "cost": 1 },
    "ch": { "name": "chain", "cost": 1 },
    "invdec": { "name": "invisible decrease", "cost": 2 },
    "dec": { "name": "decrease", "cost": 2 }
}

const plurals = {
    "stitch": "stitches",
    "backloop": "backloops",
}

var row
var point
var recipe

const code = "#simple ball;#magic ring;6sc;2sc;1sc+2sc;1sc+1sc+2sc;1sc+1sc+1sc+2sc;1sc;1sc;1sc;1sc;1sc;1sc;1sc;1sc+1sc+1sc+1dec;1sc+1sc+1dec;1sc+1dec;#fill;1dec;#wrap;#done!"
document.getElementById("recipe").value = code
compileRecipe()

function compileRecipe() {
    const code = document.getElementById("recipe").value
    parseRecipe(code)

    populateRows()

    row = -1
    point = -1
    nextRow()
}

function parseRecipe(code) {
    recipe = []
    let rowId = 0
    let previousPoints = 1

    const instructions = code.split(";")
    instructions.forEach(function (instruction) {
        if (instruction[0] == "#") {
            // is a comment
            let comment = instruction.slice(1)
            recipe.push({ "text": comment })
            return
        }

        // is a row
        rowId = rowId + 1

        let prefix = ""
        if (instruction[instruction.length - 1] == ")") {
            // have prefix
            prefix = instruction.split("(")[0]
            instruction = instruction.split("(")[1].slice(0, -1)
        }

        // separate points
        let points = instruction.split("+")
        points = points.map(function (point) {
            // separate number of points
            point = point.split(/(?<=^\d+)/)
            point[0] = parseInt(point[0])
            return point
        })

        let cost = 0
        const expandedPoints = []
        points.forEach(function (point) {
            cost = cost + table[point[1]].cost
            // expand points by the number of points
            for (let i = 0; i < point[0]; i++) {
                expandedPoints.push([i + 1, point[1]])
            }
        })

        let expandedRow = []
        for (let i = 0; i < previousPoints / cost; i++) {
            // expand points by the number of points of the previous row
            expandedRow = expandedRow.concat(expandedPoints)
        }

        previousPoints = expandedRow.length

        let row = { "row": rowId, "text": prefix + " " + instruction, "points": expandedRow }
        if (prefix) row["prefix"] = prefix
        recipe.push(row)
    })

    return recipe
}

function populateRows() {
    const rowsElem = document.getElementById("rows")
    rowsElem.innerHTML = ""

    recipe.forEach(function (row, index) {
        const rowElem = document.createElement("button")
        rowElem.className = "list-group-item list-group-item-action d-flex justify-content-between align-items-center"
        rowElem.addEventListener("click", () => { setRow(index) })

        if (!("points" in row)) {
            // is a comment
            const span = document.createElement("span")
            span.innerText = row.text
            rowElem.appendChild(span)
        }
        else {
            // is a row
            const div = document.createElement("div")
            const rowBadge = document.createElement("span")
            rowBadge.className = "badge rounded-pill bg-secondary"
            rowBadge.innerText = "row" + row.row
            const span = document.createElement("span")
            span.innerText = row.text
            div.appendChild(rowBadge)
            div.appendChild(document.createTextNode("\n"))
            div.appendChild(span)

            const pointsBadge = document.createElement("span")
            pointsBadge.className = "badge rounded-pill bg-secondary"
            pointsBadge.innerText = row.points.length + "pt"

            rowElem.appendChild(div)
            rowElem.appendChild(pointsBadge)
        }

        rowsElem.appendChild(rowElem)
    })
}

function nextPoint() {
    point = point + 1

    // if is a comment or dont have more points
    if (!("points" in recipe[row]) || point >= recipe[row].points.length) {
        nextRow()
    }
    else {
        updatePoint()
        nextPointAudio()
    }
}

function previousPoint() {
    point = point - 1

    // if is a comment or dont have more points
    if (!("points" in recipe[row]) || point < 0) {
        previousRow()
    }
    else {
        updatePoint()
        previousPointAudio()
    }
}

function updatePoint() {
    const pointElem = document.getElementById("point")
    const descriptionElem = document.getElementById("point-description")
    const progressElem = document.getElementById("points-progress")

    const currRow = recipe[row]

    if (!("points" in currRow)) {
        // update comment, description and progress bar
        pointElem.innerText = currRow.text

        descriptionElem.innerText = "comment"

        progressElem.style.width = "100%"
        progressElem.innerText = "1/1"
    }
    else {
        // update point, description and progress bar
        const currPoint = currRow.points[point]

        const prefix = "prefix" in currRow ? currRow.prefix + " " : ""
        pointElem.innerText = prefix + currPoint[0] + currPoint[1]

        const pointName = table[currPoint[1]].name
        const position = currPoint[0] > 1 ? "in current" : "into next"
        let stitch = "prefix" in currRow ? currRow.prefix : "stitch"
        stitch = table[currPoint[1]].cost > 1 ? plurals[stitch] : stitch
        descriptionElem.innerText = pointName + " " + position + " " + stitch

        progressElem.style.width = ((point + 1) / currRow.points.length * 100) + "%"
        progressElem.innerText = (point + 1) + "/" + currRow.points.length
    }
}

function nextRow() {
    // if not start of recipe
    if (row >= 0) {
        // remove current row active highlight and add done highlight 
        const rowsList = document.getElementById("rows").children
        rowsList[row].classList.remove("active")
        rowsList[row].classList.add("list-group-item-primary")
    }

    // update to next or last row
    row = Math.min(row + 1, recipe.length - 1)
    updateRow()
    // update to first point
    point = 0
    updatePoint()

    nextRowAudio()
}

function previousRow() {
    // remove current row active highlight
    const rowsElem = document.getElementById("rows").children
    rowsElem[row].classList.remove("active")

    // update to previous or first row
    row = Math.max(row - 1, 0)
    updateRow()
    // update to last point or comment
    point = "points" in recipe[row] ? recipe[row].points.length - 1 : 0
    updatePoint()

    previousRowAudio()
}

function updateRow() {
    // remove new row done highlight and add active highlight 
    const rowsElem = document.getElementById("rows").children
    rowsElem[row].classList.remove("list-group-item-primary")
    rowsElem[row].classList.add("active")

    rowsElem[row].scrollIntoView({ "behavior": "smooth", "block": "center" })

    const progressElem = document.getElementById("rows-progress")
    progressElem.style.width = ((row + 1) / recipe.length * 100) + "%"
    progressElem.innerText = (row + 1) + "/" + recipe.length
}

function setRow(newRow) {
    const rowsElem = document.getElementById("rows").children

    if (newRow > row) {
        // adjust highlights
        rowsElem[row].classList.remove("active")
        for (let i = row; i < newRow; i++) {
            rowsElem[i].classList.add("list-group-item-primary")
        }

        // update to new row and to first point
        row = newRow
        updateRow()
        point = 0
        updatePoint()

        nextRowAudio()
    }
    else if (newRow < row) {
        // if new row is lower than current

        // adjust highlights
        rowsElem[row].classList.remove("active")
        for (let i = row - 1; i > newRow; i--) {
            rowsElem[i].classList.remove("list-group-item-primary")
        }

        // update to new row and to last point
        row = newRow
        updateRow()
        // update to last point or comment
        point = "points" in recipe[row] ? recipe[row].points.length - 1 : 0
        updatePoint()

        previousRowAudio()
    }
}

function playAudio(frequency, type, duration) {
    const oscillator = audioCtx.createOscillator()
    oscillator.type = type
    oscillator.frequency.value = frequency

    const gain = audioCtx.createGain()
    gain.gain.value = 0.2

    gain.connect(audioCtx.destination)
    oscillator.connect(gain)
    oscillator.start(0)

    gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration)
}
function nextPointAudio() {
    playAudio(500, "square", 0.5)
}
function previousPointAudio() {
    playAudio(400, "sawtooth", 0.5)
}
function nextRowAudio() {
    playAudio(600, "square", 1.0)
}
function previousRowAudio() {
    playAudio(300, "sawtooth", 1.0)
}