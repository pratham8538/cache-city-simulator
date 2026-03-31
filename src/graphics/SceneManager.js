import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class SceneManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);

        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = null; // Let CSS gradient show through
        this.scene.fog = new THREE.FogExp2(0x0a0c10, 0.015); // Add depth with subtle fog
        this.raycaster = new THREE.Raycaster();

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            50,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 15, 30);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1; // Don't go below ground

        this.setupLights();
        this.setupEnvironment();

        // Resize listener
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 20, 10);
        this.scene.add(dirLight);

        const blueLight = new THREE.PointLight(0x3b82f6, 1, 50);
        blueLight.position.set(15, 5, 0); // Near memory
        this.scene.add(blueLight);

        const greenLight = new THREE.PointLight(0x10b981, 1, 50);
        greenLight.position.set(0, 5, 0); // Near cache
        this.scene.add(greenLight);
    }

    setupEnvironment() {
        // Aesthetic floating background particles
        const particleCount = 1500;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        const color1 = new THREE.Color(0x60a5fa); // light blue
        const color2 = new THREE.Color(0xa855f7); // purple
        const color3 = new THREE.Color(0x10b981); // emerald green

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 150;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 150;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 150;

            let mixedColor;
            const rand = Math.random();
            if (rand < 0.33) mixedColor = color1;
            else if (rand < 0.66) mixedColor = color2;
            else mixedColor = color3;

            // Add a little randomness to the color to blend them nicely
            mixedColor = mixedColor.clone().lerp(new THREE.Color(0xffffff), Math.random() * 0.2);

            colors[i * 3] = mixedColor.r;
            colors[i * 3 + 1] = mixedColor.g;
            colors[i * 3 + 2] = mixedColor.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);

        // Subtle grid for a cyber/tech look
        const gridHelper = new THREE.GridHelper(200, 100, 0x3b82f6, 0x3b82f6);
        gridHelper.position.y = -10;
        gridHelper.material.opacity = 0.08;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    getRaycaster(mouse) {
        this.raycaster.setFromCamera(mouse, this.camera);
        return this.raycaster;
    }

    update() {
        this.controls.update();

        if (this.particles) {
            // Gentle swirling animation for particles
            this.particles.rotation.y += 0.0003;
            this.particles.rotation.x += 0.0001;
        }

        this.renderer.render(this.scene, this.camera);
    }
}
