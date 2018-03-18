
class Ship{
    constructor(name, coordinates)
    {
        this.name = name;
        this.coordinates = coordinates;
        this.length = 0;
        this.hits = 0;
        this.isSunk = false;
    }

    makeAHit(){
        if(this.hits < this.length)
        {
            this.hits = this.hits + 1;
            if(this.hits == this.length)
            {
                this.isSunk = true;
            }
        }
    }
}

module.exports = Ship;