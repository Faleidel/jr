document.addEventListener("DOMContentLoaded", init);
document.addEventListener("keydown",function(){
    robots.push( mkRobot(Math.random()*gameWidth,Math.random()*gameHeight,randTeam()) );
});

gameWidth = innerWidth;
gameHeight = innerHeight;

function init()
{
    var canvas = document.createElement("canvas");
    canvas.height = gameHeight;
    canvas.width = gameWidth;
    document.body.appendChild(canvas);
    
    ctx = canvas.getContext("2d");
    
    robots = [];
    food = [];
    
    for ( var i = 0 ; i < 150 ; i++)
        robots.push( mkRobot(Math.random()*gameWidth,Math.random()*gameHeight,randTeam()) );
    
    time = 0;
    setInterval(function()
    {
        time += 1;
        var draw = time % 8 == 0;
        
        if ( draw )
            ctx.clearRect(0,0,gameWidth,gameHeight);
        
        if ( food.length < 1000 )
            for ( var i = 0 ; i < 2 ; i++ )
                food.push({ x : Math.random()*gameWidth , y : Math.random()*gameHeight , value : 10 });
        
        ctx.fillStyle = "yellow";
        for ( var i = 0 ; i < food.length ; i++ )
        {
            if ( draw )
                ctx.fillRect(food[i].x,food[i].y,3,3);
            food[i].value += 0.01;
            
            if ( food.length >= 1000 )
            {
                var ii = Math.floor(Math.random()*food.length);
                if ( dist22( food[i] , food[ii] ) < 10*10 )
                {
                    food[i].value += food[ii].value;
                    food.splice(ii,1);
                    i -= 1;
                }
            }
        }
        
        for ( var i = 0 ; i < robots.length ; i++ )
        {
            var robot = robots[i];
            
            if ( robot.team == 1 ) ctx.fillStyle = "red";
            if ( robot.team == 2 ) ctx.fillStyle = "green";
            if ( robot.team == 3 ) ctx.fillStyle = "blue";
            
            var dead = updateRobot(robot,robot.fa,robot.fd,robot.ea,robot.ed);
            
            if ( robot.team != 1 )
            {
                for ( var ii = 0 ; ii < robots.length ; ii++ )
                {
                    if ( ((robot.team == 2 && robots[ii].team == 1) || (robot.team == 3 && robots[ii].team == 2)) )
                    {
                        if ( dist22(robot,robots[ii]) < 10*10 )
                        {
                            robot.energie += robots[ii].energie;
                            robots[ii].energie = -100;
                        }
                    }
                    else if ( robot.team+1 == robots[ii].team && dist22(robot,robots[ii]) < 50*50 )
                    {
                        robot.ea = getAngle( robots[ii].x , robots[ii].y , robot.x , robot.y );
                        robot.ed = dist22(robot,robots[ii]);
                    }
                    else if ( robot.team == robots[ii].team && dist22(robot,robots[ii]) < 50*50 )
                    {
                        robot.fa = getAngle( robots[ii].x , robots[ii].y , robot.x , robot.y );
                        robot.fd = dist22(robot,robots[ii]);
                    }
                }
            }
            else
                for ( var ii = 0 ; ii < food.length ; ii++ )
                    if ( dist22(robot,food[ii]) < 20*20 )
                    {
                        robot.energie += food[ii].value;
                        food.splice(ii,1);
                        ii -= 1;
                    }
            
            if ( draw )
                ctx.fillRect(robot.x-1,robot.y-1,3,3);
            
            if ( dead )
            {
                robots.splice(i,1);
                i -= 1;
            }
        }
    },1000/240);
}

function randTeam()
{
    if ( Math.random() < 0.3 ) return 1;
    if ( Math.random() < 0.5 ) return 2;
    return 3;
}

var memSize = 5;
var netDepth = 0;
var netWidth = 1      + 1     + 1       + 2     + 1       + 4                 + memSize;
var pt1 = netWidth - memSize;
//             random + cons1 + counter + x + y + energie + FA + FD + EA + ED + mem
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
            , ea : 0
            , ed : 0
            , fa : 0
            , fd : 0
            , energie : 200
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
    
    if ( Math.random() < 0.005 )
    {
        r.team += 1;
        if ( r.team == 4 ) r.team == 3;
    }
    
    for ( var i = 0 ; i < p.net.length ; i++ )
        r.net[i] = p.net[i];
    
    for ( var i = 0 ; i < 100 ; i++ )
        r.net[ Math.floor(Math.random()*r.net.length) ] += (Math.random()*1)-0.5;
    
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
    
    // NET
    r.net[0] = Math.random();
    r.net[1] = r.x / gameWidth;
    r.net[2] = r.y / gameWidth;
    r.net[3] = r.energie/100;
    r.net[4] = 1;
    r.net[5] = Math.sin(time*r.net[10]);
    
    r.net[6] = fa;
    r.net[7] = fd;
    r.net[8] = ea;
    r.net[9] = ed;
    
    var memOutStart = netWidth * (netDepth+1) + 4;
    for ( var i = 0 ; i < memSize ; i++ )
        r.net[pt1+i] = r.net[memOutStart+i]; // TODO GET OLD MEM
    
    for ( var d = 0 ; d < (netDepth+1) ; d++ )
    {
        var layerStart = netWidth * (d+1);
        var lastLayer = netWidth * d;
        var layerP2 = layerStart + netWidth;
        
        for ( var i = 0 ; i < netWidth ; i++ )
        {
            var connStart = layerP2 + (netWidth * i);
            var node = layerStart + i;
            var nodeValue = 0;
            
            if ( i == 4 )
                nodeValue = 10000;
            else
                for ( var c = 0 ; c < netWidth ; c++ )
                    nodeValue += r.net[lastLayer+c] * r.net[connStart+c];
            
            r.net[node] = sigmoid(nodeValue);
        }
    }
    // /NET
    
    var outPutStart = netWidth * (netDepth+1);
    
    r.angle = r.net[outPutStart]*360;
    var speed = (r.net[outPutStart+1]-0.5)/2;
    r.velX += trustX( r.angle , speed );
    r.velY += trustY( r.angle , speed );
    
    r.energie -= Math.abs(speed);
    
    if ( r.net[outPutStart+2] > 0.9 && r.energie > 300 )
    {
        r.energie /= 2.2;
        var child = cloneRobot(r);
        robots.push(child);
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

function getAngle( tx , ty , mx , my  )
{
    var deltaX = mx - tx;
    var deltaY = my - ty;
    return (Math.atan2( deltaY , deltaX ))/Math.PI*180;
}
