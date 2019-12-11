import * as React from "react";
import { useEffect, useRef, useContext } from "react";
import * as THREE from 'three';
import { useIntersection } from 'use-intersection';
import { VFXContext, VFXElementType } from './context';
import { createElementId } from './util';

const VFXImg: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = (props) => {
    const { dispatch } = useContext(VFXContext);
    const id = useRef(createElementId());
    const ref = useRef<HTMLImageElement>(null);
    const isInViewport = useIntersection(ref);

    // Create scene
    useEffect(() => {
        if (ref.current === null) { return; }

        const scene = new THREE.Scene();
        const quad = new THREE.PlaneGeometry();
        const material = new THREE.RawShaderMaterial();
        scene.add(new THREE.Mesh(quad, material));

        const elem = {
            id: id.current,
            element: ref.current,
            type: 'img' as VFXElementType,
            scene,
            material,
            isInViewport,
        };

        dispatch({ type: "ADD_ELEMENT", payload: elem });

        return () => {
            dispatch({ type: "REMOVE_ELEMENT", payload: { id: id.current } });
        };
    }, [ref]);

    // Update isInViewport
    useEffect(() => {
        dispatch({ type: "TOGGLE_ELEMENT", payload: { id: id.current, isInViewport } });
    }, [isInViewport]);

    return (
        <img ref={ref} {...props}/>
    );
};

export default VFXImg;
