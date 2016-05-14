document.addEventListener("DOMContentLoaded", init);

gameWidth = 600;
gameHeight = 600;

function init()
{
    var canvas = document.createElement("canvas");
    canvas.height = gameWidth;
    canvas.width = gameHeight;
    document.body.appendChild(canvas);
    
    ctx = canvas.getContext("2d");
    
    robots = [];
    
    for ( var i = 0 ; i < 50 ; i++)
        robots.push( mkRobot(Math.random()*gameWidth,Math.random()*gameHeight,randTeam()) );
    
    setInterval(function()
    {
        ctx.clearRect(0,0,1000,1000);
        
        for ( var i = 0 ; i < robots.length ; i++ )
        {
            var robot = robots[i];
            
            if ( robot.team == 1 ) ctx.fillStyle = "red";
            if ( robot.team == 2 ) ctx.fillStyle = "green";
            if ( robot.team == 3 ) ctx.fillStyle = "blue";
            
            var dead = updateRobot(robot,0,0,0,0);
            
            if ( robot.team != 1 )
                for ( var ii = i+1 ; ii < robots.length ; ii++ )
                    if ( ((robot.team == 2 && robots[ii].team == 1) || (robot.team == 3 && robots[ii].team == 2)) && dist22(robot,robots[ii]) < 2*2 )
                    {
                        robot.energie += robots[ii].energie;
                        robots[ii].energie = -100;
                    }
            
            ctx.fillRect(robot.x-1,robot.y-1,3,3);
            
            if ( dead )
            {
                robots.splice(i,1);
                i -= 1;
            }
        }
    },1000/30);
}

function randTeam()
{
    if ( Math.random() < 0.3 ) return 1;
    if ( Math.random() < 0.5 ) return 2;
    return 3;
}

var memSize = 5;
var netDepth = 3;
var netWidth = 1      + 2     + 1       + 4                 + memSize;
//             random + x + y + energie + FA + FD + EA + ED + mem
//var outputWidth = 1 + 1 + 1 + 1 + memSize;
var outputWidth = netWidth;
var netSize = 4 * netWidth;
netSize += 4 * outputWidth * netWidth;
netSize += 4 * netWidth * netWidth * netDepth;

function mkRobot(x,y,team)
{
    var r = { x : x
            , y : y
            , velX : 0
            , velY : 0
            , angle : 0
            , team : team
            , energie : 100
            , net : new Float32Array(new ArrayBuffer(netSize))
            };
    
    for ( var i = 0 ; i < r.net.length ; i++ )
        r.net[i] = (Math.random()*2)-1;
    
    return r;
}

function cloneRobot(p)
{
    var r = mkRobot(p.x,p.y,p.team);
    r.energie = p.energie;
    
    for ( var i = 0 ; i < p.net.length ; i++ )
        r.net[i] = p.net[i];
    
    for ( var i = 0 ; i < 100 ; i++ )
        r.net[ Math.floor(Math.random()*r.net.length) ] += (Math.random()*2)-1;
    
    return r;
}

function updateRobot(r,fa,fd,ea,ed)
{
    r.x += r.velX;
    r.y += r.velY;
    
    if ( r.x > gameWidth ) r.x = gameWidth;
    if ( r.x < 0 ) r.x = 0;
    if ( r.y > gameHeight ) r.y = gameHeight;
    if ( r.y < 0 ) r.y = 0;
    
    r.velX *= 0.85;
    r.velY *= 0.85;
    
    r.energie += 1;
    
    // NET
    r.net[0] = Math.random();
    r.net[1] = r.x / gameWidth;
    r.net[2] = r.y / gameWidth;
    r.net[3] = r.energie/1000;
    
    r.net[4] = fa;
    r.net[5] = fd;
    r.net[6] = ea;
    r.net[7] = ed;
    
    var memOutStart = (7 + memSize) * (netDepth+1) + 4;
    for ( var i = 0 ; i < memSize ; i++ )
        r.net[8+i] = r.net[memOutStart+i]; // TODO GET OLD MEM
    
    for ( var d = 0 ; d < (netDepth+1) ; d++ )
    {
        var layerStart = (7 + memSize) * (d+1);
        var lastLayer = (7 + memSize) * d;
        var layerP2 = layerStart + netWidth;
        
        for ( var i = 0 ; i < netWidth ; i++ )
        {
            var connStart = layerP2 + (netWidth * i);
            var node = layerStart + i;
            var nodeValue = 0;
            
            for ( var c = 0 ; c < netWidth ; c++ )
                nodeValue += r.net[lastLayer+c] * r.net[connStart+c];
            
            r.net[node] = sigmoid(nodeValue);
        }
    }
    // /NET
    
    var outPutStart = (7 + memSize) * (netDepth+1);
    
    r.angle += (r.net[outPutStart]-0.5)*20;
    var speed = r.net[outPutStart+1]-0.5;
    r.velX += trustX( r.angle , speed );
    r.velY += trustY( r.angle , speed );
    
    r.energie -= speed*2;
    
    if ( r.net[outPutStart+2] > 0.9 && r.energie > 100 )
    {
        r.energie /= 2;
        var child = cloneRobot(r);
        robots.push(r);
    }
    
    return r.energie <= 0;
}

function sigmoid(t) {
    return 1/(1+Math.pow(Math.E, -t));
}

function trustX( angle , power )
{
    return Math.cos(angle * (Math.PI / 180)) * power;
}

function trustY( angle , power )
{
    return Math.sin((angle * (Math.PI / 180))) * power;
}

function dist22(obj1 , obj2)//same dist2 but with obj
{
    return Math.pow(obj1.x-obj2.x,2) + Math.pow(obj1.y-obj2.y,2);
}
